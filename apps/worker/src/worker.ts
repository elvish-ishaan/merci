import { Worker, type Job } from 'bullmq'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import prisma from '@repo/db'
import { decryptValue } from '@repo/crypto'
import { cloneRepo } from './lib/git'
import { buildInDocker, detectBuildDir } from './lib/docker'
import { assertViteProject } from './lib/validate'
import { uploadDir } from './lib/r2'

interface DeployJobData {
  projectId: string
  repoUrl: string
  encryptedEnvVars?: { key: string; encryptedValue: string }[]
}

async function processJob(job: Job<DeployJobData>): Promise<void> {
  const { projectId, repoUrl, encryptedEnvVars = [] } = job.data
  const tempDir = path.join(os.tmpdir(), `mercy-${projectId}`)

  try {
    await prisma.project.update({ where: { id: projectId }, data: { status: 'CLONING' } })
    console.log(`[${projectId}] Cloning ${repoUrl}`)
    await cloneRepo(repoUrl, tempDir)

    assertViteProject(tempDir)

    const envVars = encryptedEnvVars.map(({ key, encryptedValue }) => ({
      key,
      value: decryptValue(encryptedValue),
    }))

    await prisma.project.update({ where: { id: projectId }, data: { status: 'BUILDING' } })
    console.log(`[${projectId}] Building in Docker`)
    await buildInDocker(tempDir, envVars)

    const buildDir = detectBuildDir(tempDir)
    const prefix = `builds/${projectId}`
    console.log(`[${projectId}] Uploading build output from ${buildDir}`)
    await uploadDir(buildDir, prefix)

    const deployedUrl = `${process.env['API_BASE_URL'] ?? 'http://localhost:3001'}/app/${projectId}`
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DEPLOYED', bucketPrefix: prefix, deployedUrl },
    })
    console.log(`[${projectId}] Deployed successfully`)
  } catch (err) {
    console.error(`[${projectId}] Failed:`, err)
    await prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } })
    throw err
  } finally {
    await fs.remove(tempDir).catch(() => {})
  }
}

export function createWorker(): Worker<DeployJobData> {
  const worker = new Worker<DeployJobData>('deployments', processJob, {
    connection: {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: Number(process.env['REDIS_PORT'] ?? 6379),
    },
    concurrency: 2,
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
  })

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  return worker
}
