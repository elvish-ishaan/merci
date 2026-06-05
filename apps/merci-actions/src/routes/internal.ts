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

// Receive a log line for a step
internal.post('/action-logs', requireWorkerAuth, async (req: Request, res: Response) => {
  const { stepId, line, stream } = req.body as {
    stepId?: string
    line?: string
    stream?: 'stdout' | 'stderr'
  }

  if (!stepId || line === undefined) {
    res.status(400).json({ error: 'stepId and line are required' })
    return
  }

  const log = await prisma.actionLog.create({
    data: { stepId, line, stream: stream ?? 'stdout' },
  })

  await redisPub.publish(
    `action:step:${stepId}`,
    JSON.stringify({ type: 'log', id: log.id.toString(), line, stream: log.stream }),
  )

  logger.debug({ stepId, stream }, 'action log received')
  res.status(201).json({ ok: true })
})

// Update step status
internal.patch('/action-steps/:stepId', requireWorkerAuth, async (req: Request, res: Response) => {
  const { stepId } = req.params
  const { status, conclusion, startedAt, completedAt } = req.body as {
    status?: string
    conclusion?: string
    startedAt?: string
    completedAt?: string
  }

  try {
    const step = await prisma.actionStep.update({
      where: { id: stepId },
      data: {
        ...(status && { status: status as any }),
        ...(conclusion !== undefined && { conclusion }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
      },
      select: { jobId: true },
    })

    await redisPub.publish(
      `action:step:${stepId}`,
      JSON.stringify({ type: 'status', status, conclusion }),
    )

    logger.debug({ stepId, status }, 'step status updated')
    res.json({ ok: true, jobId: step.jobId })
  } catch {
    res.status(404).json({ error: 'Step not found' })
  }
})

// Update job status
internal.patch('/action-jobs/:jobId', requireWorkerAuth, async (req: Request, res: Response) => {
  const { jobId } = req.params
  const { status, conclusion, startedAt, completedAt } = req.body as {
    status?: string
    conclusion?: string
    startedAt?: string
    completedAt?: string
  }

  try {
    const job = await prisma.actionJob.update({
      where: { id: jobId },
      data: {
        ...(status && { status: status as any }),
        ...(conclusion !== undefined && { conclusion }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
      },
      select: { runId: true },
    })

    await redisPub.publish(
      `action:job:${jobId}`,
      JSON.stringify({ type: 'status', status, conclusion }),
    )

    logger.debug({ jobId, status }, 'job status updated')
    res.json({ ok: true, runId: job.runId })
  } catch {
    res.status(404).json({ error: 'Job not found' })
  }
})

// Update run status
internal.patch('/action-runs/:runId', requireWorkerAuth, async (req: Request, res: Response) => {
  const { runId } = req.params
  const { status, conclusion, startedAt, completedAt } = req.body as {
    status?: string
    conclusion?: string
    startedAt?: string
    completedAt?: string
  }

  try {
    await prisma.actionRun.update({
      where: { id: runId },
      data: {
        ...(status && { status: status as any }),
        ...(conclusion !== undefined && { conclusion }),
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
      },
    })

    await redisPub.publish(
      `action:run:${runId}`,
      JSON.stringify({ type: 'status', status, conclusion }),
    )

    logger.debug({ runId, status }, 'run status updated')
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Run not found' })
  }
})

export default internal
