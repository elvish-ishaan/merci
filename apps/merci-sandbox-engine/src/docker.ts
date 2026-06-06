import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'
import { logger } from './lib/logger'

export interface ExecuteRequest {
  code: string
  language: 'js' | 'ts'
  timeout: number
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

// oven/bun:alpine natively runs both .js and .ts — no custom image needed
const SANDBOX_IMAGE = process.env['SANDBOX_IMAGE'] ?? 'oven/bun:alpine'

// On Windows, Docker Desktop expects forward-slash paths: C:\foo\bar -> C:/foo/bar
function toDockerVolumePath(hostPath: string): string {
  if (process.platform === 'win32') {
    return hostPath.replace(/\\/g, '/')
  }
  return hostPath
}

export async function executeInSandbox(req: ExecuteRequest): Promise<ExecuteResult> {
  const { code, language, timeout } = req
  const runId = randomUUID()
  // Use os.tmpdir() so this works on both Windows (e.g. C:\Users\...\AppData\Local\Temp)
  // and Linux (/tmp) — hardcoding /tmp breaks on Windows hosts.
  const tmpDir = path.join(os.tmpdir(), `sandbox-${runId}`)
  const filename = language === 'ts' ? 'code.ts' : 'code.js'
  const filePath = path.join(tmpDir, filename)
  const start = Date.now()

  logger.info({ runId, language, timeout, image: SANDBOX_IMAGE, tmpDir, platform: process.platform }, '[docker] creating temp dir')
  mkdirSync(tmpDir, { recursive: true })

  logger.info({ runId, filePath, codeLength: code.length }, '[docker] writing code file')
  writeFileSync(filePath, code, 'utf-8')

  const fileExists = existsSync(filePath)
  logger.info({ runId, filePath, fileExists }, '[docker] file write verified')
  if (!fileExists) throw new Error(`Failed to write code file at ${filePath}`)

  const dockerSrcPath = toDockerVolumePath(tmpDir)
  const volumeMount = `${dockerSrcPath}:/code:ro`
  const dockerArgs = [
    'docker', 'run', '--rm',
    '--network', 'none',
    '--memory', '256m',
    '--cpus', '0.5',
    '--user', '1000',
    '-v', volumeMount,
    SANDBOX_IMAGE,
    'timeout', String(timeout), 'bun', `/code/${filename}`,
  ]

  logger.info({ runId, dockerArgs, volumeMount }, '[docker] spawning container')

  try {
    const proc = Bun.spawn(dockerArgs, { stdout: 'pipe', stderr: 'pipe' })

    logger.info({ runId }, '[docker] container started, waiting for output')

    const [stdoutText, stderrText] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    const exitCode = proc.exitCode ?? 1
    const durationMs = Date.now() - start

    logger.info(
      { runId, exitCode, durationMs, stdoutPreview: stdoutText.slice(0, 200), stderrPreview: stderrText.slice(0, 200) },
      '[docker] container exited',
    )

    return { stdout: stdoutText, stderr: stderrText, exitCode, durationMs }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
    logger.debug({ runId, tmpDir }, '[docker] temp dir cleaned up')
  }
}
