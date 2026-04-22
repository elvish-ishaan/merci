import { type Job } from 'bullmq'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import unzipper from 'unzipper'
import * as esbuild from 'esbuild'
import prisma from '@repo/db'
import { r2 } from './lib/r2'

const BUCKET = process.env['R2_BUCKET_NAME']!

export interface MercioBuildJobData {
  functionId: string
  zipKey: string
  buildCommand: string | null
  entry: string
}

// Shim that wraps Node-style handler (module.exports = async (req) => ({status, headers, body}))
// into the Cloudflare Workers fetch(request) contract that workerd expects.
const SHIM_CONTENT = `
import handler from '__USER_ENTRY__'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const method = request.method
    const headers = Object.fromEntries(request.headers)
    const query = Object.fromEntries(url.searchParams)
    let body = null
    if (method !== 'GET' && method !== 'HEAD') {
      const ct = headers['content-type'] ?? ''
      try {
        body = ct.includes('application/json') ? await request.json() : await request.text()
      } catch {
        body = null
      }
    }
    const req = { method, url: request.url, path: url.pathname, headers, query, body }
    try {
      const r = (await handler(req)) ?? {}
      return new Response(r.body ?? '', {
        status: r.status ?? 200,
        headers: r.headers ?? {},
      })
    } catch (err) {
      return new Response(String(err?.stack ?? err), { status: 500 })
    }
  }
}
`

async function runDockerBuild(workDir: string, buildCommand: string): Promise<void> {
  const proc = Bun.spawn(
    [
      'docker', 'run', '--rm',
      '-v', `${workDir}:/app`,
      '-w', '/app',
      'node:20-alpine',
      'sh', '-c', buildCommand,
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (exitCode !== 0) {
    throw new Error(`Build command failed (exit ${exitCode}):\n${stderr || stdout}`)
  }
}

export async function mercioBuildJob(job: Job<MercioBuildJobData>): Promise<void> {
  const { functionId, zipKey, buildCommand, entry } = job.data
  const tmpDir = path.join(os.tmpdir(), `mercio-${functionId}`)
  const srcDir = path.join(tmpDir, 'src')
  const outDir = path.join(tmpDir, 'out')

  try {
    await prisma.mercioFunction.update({
      where: { id: functionId },
      data: { status: 'BUILDING', errorMessage: null },
    })

    // 1. Download zip from R2
    await fs.ensureDir(srcDir)
    await fs.ensureDir(outDir)

    const zipResp = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: zipKey }))
    const zipPath = path.join(tmpDir, 'source.zip')
    await pipeline(zipResp.Body as NodeJS.ReadableStream, createWriteStream(zipPath))

    // 2. Unzip
    await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: srcDir })).promise()

    // 2b. Flatten single top-level directory (handles zips created by right-clicking a folder
    //     on Windows/macOS, which wrap contents inside e.g. with-deps/package.json).
    const topEntries = await fs.readdir(srcDir)
    if (topEntries.length === 1) {
      const only = path.join(srcDir, topEntries[0]!)
      const stat = await fs.stat(only)
      if (stat.isDirectory()) {
        const flatDir = path.join(tmpDir, 'src-flat')
        await fs.move(only, flatDir)
        await fs.remove(srcDir)
        await fs.move(flatDir, srcDir)
      }
    }

    // 3. Run build command in Docker if provided
    if (buildCommand) {
      await runDockerBuild(srcDir, buildCommand)
    }

    // 4. Write shim that imports user's entry and re-exports as fetch handler
    const entryResolved = path.resolve(srcDir, entry)
    if (!await fs.pathExists(entryResolved)) {
      throw new Error(`Entry file "${entry}" not found in the uploaded zip`)
    }

    const shimPath = path.join(tmpDir, '__mercio_shim__.mjs')
    const shimContent = SHIM_CONTENT.replace('__USER_ENTRY__', entryResolved.replace(/\\/g, '/'))
    await fs.writeFile(shimPath, shimContent, 'utf8')

    // 5. Bundle shim + user code into a single ESM worker.mjs
    const workerOut = path.join(outDir, 'worker.mjs')
    await esbuild.build({
      entryPoints: [shimPath],
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      outfile: workerOut,
      // workerd supports nodejs_compat so node builtins resolve; treat them as external
      // to avoid bundling polyfills
      packages: 'external',
    })

    // 6. Upload worker.mjs + metadata to R2
    const bundleKey = `mercio/${functionId}/worker.mjs`
    const workerBytes = await fs.readFile(workerOut)
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: bundleKey,
        Body: workerBytes,
        ContentType: 'text/javascript',
      })
    )

    const metadata = JSON.stringify({ entry, bundledAt: new Date().toISOString() })
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `mercio/${functionId}/metadata.json`,
        Body: metadata,
        ContentType: 'application/json',
      })
    )

    // 7. Mark deployed
    await prisma.mercioFunction.update({
      where: { id: functionId },
      data: { status: 'DEPLOYED', bundleKey },
    })
    console.log(`[mercio][${functionId}] Deployed successfully`)
  } catch (err: any) {
    console.error(`[mercio][${functionId}] Build failed:`, err)
    await prisma.mercioFunction.update({
      where: { id: functionId },
      data: { status: 'FAILED', errorMessage: err?.message ?? String(err) },
    })
    throw err
  } finally {
    await fs.remove(tmpDir).catch(() => {})
  }
}
