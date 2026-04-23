import { Router, type Request, type Response, type NextFunction } from 'express'
import prisma from '../lib/prisma'
import { redisPub } from '../lib/redis'
import { logger } from '../lib/logger'

const internal = Router()

const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

function requireWorkerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ') || header.slice(7) !== WORKER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

internal.post('/logs', requireWorkerAuth, async (req: Request, res: Response) => {
  const { projectId, line, stream } = req.body as {
    projectId?: string
    line?: string
    stream?: 'stdout' | 'stderr'
  }

  if (!projectId || line === undefined) {
    res.status(400).json({ error: 'projectId and line are required' })
    return
  }

  const log = await prisma.buildLog.create({
    data: { projectId, line, stream: stream ?? 'stdout' },
  })

  await redisPub.publish(
    `build:${projectId}`,
    JSON.stringify({ type: 'log', id: log.id, line: log.line, stream: log.stream }),
  )

  logger.debug({ projectId, stream }, 'build log received')

  res.status(201).json({ ok: true })
})

internal.post('/status', requireWorkerAuth, async (req: Request, res: Response) => {
  const { projectId, status } = req.body as { projectId?: string; status?: string }

  if (!projectId || !status) {
    res.status(400).json({ error: 'projectId and status are required' })
    return
  }

  await redisPub.publish(
    `build:${projectId}`,
    JSON.stringify({ type: 'status', status }),
  )

  logger.debug({ projectId, status }, 'build status update received')

  res.json({ ok: true })
})

internal.post('/job-logs', requireWorkerAuth, async (req: Request, res: Response) => {
  const { runId, line, stream } = req.body as {
    runId?: string
    line?: string
    stream?: 'stdout' | 'stderr'
  }

  if (!runId || line === undefined) {
    res.status(400).json({ error: 'runId and line are required' })
    return
  }

  await prisma.jobRunLog.create({
    data: { runId, line, stream: stream ?? 'stdout' },
  })

  logger.debug({ runId, stream }, 'job run log received')
  res.status(201).json({ ok: true })
})

internal.patch('/job-runs/:runId', requireWorkerAuth, async (req: Request, res: Response) => {
  const { runId } = req.params
  const { status, httpStatus, responseBody, errorMessage, startedAt, finishedAt, durationMs, attempt } = req.body as {
    status?: string
    httpStatus?: number
    responseBody?: string
    errorMessage?: string
    startedAt?: string
    finishedAt?: string
    durationMs?: number
    attempt?: number
  }

  try {
    await prisma.jobRun.update({
      where: { id: runId },
      data: {
        ...(status && { status: status as any }),
        ...(httpStatus !== undefined && { httpStatus }),
        ...(responseBody !== undefined && { responseBody }),
        ...(errorMessage !== undefined && { errorMessage }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(finishedAt && { finishedAt: new Date(finishedAt) }),
        ...(durationMs !== undefined && { durationMs }),
        ...(attempt !== undefined && { attempt }),
      },
    })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'JobRun not found' })
  }
})

export default internal
