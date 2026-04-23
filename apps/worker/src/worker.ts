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
import { mercioBuildJob, type MercioBuildJobData } from './mercioBuild'
import { logger } from './lib/logger'

interface DeployJobData {
  projectId: string
  repoUrl: string
  encryptedEnvVars?: { key: string; encryptedValue: string }[]
  githubToken?: string
}

const API_BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3001'
const BASE_DOMAIN = process.env['BASE_DOMAIN']
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

async function postLog(projectId: string, line: string, stream: 'stdout' | 'stderr') {
  try {
    await fetch(`${API_BASE}/internal/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ projectId, line, stream }),
    })
  } catch {
    // non-fatal: log line is dropped if API is unreachable
  }
}

async function postStatus(projectId: string, status: string) {
  try {
    await fetch(`${API_BASE}/internal/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ projectId, status }),
    })
  } catch {
    // non-fatal
  }
}

async function processJob(job: Job<DeployJobData>): Promise<void> {
  const { projectId, repoUrl, encryptedEnvVars = [], githubToken } = job.data
  const tempDir = path.join(os.tmpdir(), `mercy-${projectId}`)

  logger.debug({ jobId: job.id, projectId }, 'deployment job picked up')

  try {
    await prisma.project.update({ where: { id: projectId }, data: { status: 'CLONING' } })
    await postStatus(projectId, 'CLONING')
    // githubToken is in scope but intentionally excluded from the log object — redact path covers it anyway
    logger.info({ projectId, repoUrl }, 'cloning repository')
    await cloneRepo(repoUrl, tempDir, githubToken)

    assertViteProject(tempDir)

    const envVars = encryptedEnvVars.map(({ key, encryptedValue }) => ({
      key,
      value: decryptValue(encryptedValue),
    }))
    logger.debug({ projectId, envVarCount: encryptedEnvVars.length }, 'env vars decrypted')

    await prisma.project.update({ where: { id: projectId }, data: { status: 'BUILDING' } })
    await postStatus(projectId, 'BUILDING')
    logger.info({ projectId }, 'building in docker')
    await buildInDocker(tempDir, envVars, (line, stream) => {
      postLog(projectId, line, stream)
    })

    const buildDir = detectBuildDir(tempDir)
    logger.debug({ projectId, buildDir }, 'build directory detected')

    const prefix = `builds/${projectId}`
    logger.info({ projectId, buildDir }, 'uploading build output')
    await uploadDir(buildDir, prefix)

    const subdomainRow = await prisma.project.findUnique({
      where: { id: projectId },
      select: { subdomain: true },
    })
    const deployedUrl = subdomainRow?.subdomain
      ? `https://${subdomainRow.subdomain}.${BASE_DOMAIN}`
      : `http://localhost:3001/app/${projectId}`
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'DEPLOYED', bucketPrefix: prefix, deployedUrl },
    })
    await postStatus(projectId, 'DEPLOYED')
    logger.info({ projectId, deployedUrl }, 'deployed successfully')
  } catch (err) {
    logger.error({ projectId, err }, 'deployment failed')
    await prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } })
    await postStatus(projectId, 'FAILED')
    throw err
  } finally {
    await fs.remove(tempDir).catch(() => {})
  }
}

const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

export function createWorker(): Worker<DeployJobData> {
  const worker = new Worker<DeployJobData>('deployments', processJob, {
    connection: redisConnection,
    concurrency: 2,
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'deployment job failed')
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'deployment job completed')
  })

  return worker
}

export function createMercioWorker(): Worker<MercioBuildJobData> {
  const worker = new Worker<MercioBuildJobData>('mercio-builds', mercioBuildJob, {
    connection: redisConnection,
    concurrency: 2,
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'mercio build job failed')
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'mercio build job completed')
  })

  return worker
}
