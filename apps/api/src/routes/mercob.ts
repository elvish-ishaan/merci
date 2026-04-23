import { Router, type Request, type Response } from 'express'
import { Queue } from 'bullmq'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logger } from '../lib/logger'
import type { ScheduleKind } from '@repo/db'

const mercob = Router()

const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

const mercioInvocations = new Queue('mercio-invocations', { connection: redisConnection })

// ---------- schedule helpers ----------

function computeNextRunAt(job: {
  scheduleKind: ScheduleKind
  timeOfDay?: string | null
  daysOfWeek: number[]
  intervalSec?: number | null
  cronExpr?: string | null
  runAt?: Date | null
}, from: Date = new Date()): Date | null {
  switch (job.scheduleKind) {
    case 'INTERVAL': {
      if (!job.intervalSec) return null
      return new Date(from.getTime() + job.intervalSec * 1000)
    }
    case 'DAILY': {
      const [h, m] = (job.timeOfDay ?? '00:00').split(':').map(Number)
      const next = new Date(from)
      next.setUTCHours(h!, m!, 0, 0)
      if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
      return next
    }
    case 'WEEKLY': {
      const [h, m] = (job.timeOfDay ?? '00:00').split(':').map(Number)
      const days = job.daysOfWeek.length ? job.daysOfWeek : [0]
      const base = new Date(from)
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = new Date(base)
        candidate.setUTCDate(base.getUTCDate() + offset)
        candidate.setUTCHours(h!, m!, 0, 0)
        if (days.includes(candidate.getUTCDay())) return candidate
      }
      return null
    }
    case 'CRON': {
      if (!job.cronExpr) return null
      // simple next-minute cron parsing delegated to mercob poller
      // stored as-is; poller uses cron-parser
      return new Date(from.getTime() + 60_000)
    }
    case 'ONCE': {
      return job.runAt ?? null
    }
    default:
      return null
  }
}

// ---------- routes ----------

mercob.post('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const {
    name, functionId, active = true, recurring = true,
    scheduleKind, timeOfDay, daysOfWeek = [], intervalSec, cronExpr, runAt,
    method = 'GET', path = '/', query, headers, body,
    maxRetries = 0, timeoutMs = 30000,
  } = req.body as {
    name?: string
    functionId?: string
    active?: boolean
    recurring?: boolean
    scheduleKind?: ScheduleKind
    timeOfDay?: string
    daysOfWeek?: number[]
    intervalSec?: number
    cronExpr?: string
    runAt?: string
    method?: string
    path?: string
    query?: Record<string, string>
    headers?: Record<string, string>
    body?: string
    maxRetries?: number
    timeoutMs?: number
  }

  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' })
  if (!functionId) return void res.status(400).json({ error: 'functionId is required' })
  if (!scheduleKind) return void res.status(400).json({ error: 'scheduleKind is required' })

  const fn = await prisma.mercioFunction.findFirst({ where: { id: functionId, userId } })
  if (!fn) return void res.status(404).json({ error: 'Function not found' })

  const jobShape = {
    scheduleKind,
    timeOfDay: timeOfDay ?? null,
    daysOfWeek: daysOfWeek ?? [],
    intervalSec: intervalSec ?? null,
    cronExpr: cronExpr ?? null,
    runAt: runAt ? new Date(runAt) : null,
  }
  const nextRunAt = computeNextRunAt(jobShape)
  if (!nextRunAt) return void res.status(400).json({ error: 'Cannot compute nextRunAt from given schedule' })

  const job = await prisma.scheduledJob.create({
    data: {
      userId, functionId, name: name.trim(), active, recurring,
      scheduleKind, timeOfDay, daysOfWeek, intervalSec, cronExpr,
      runAt: runAt ? new Date(runAt) : undefined,
      method, path, query, headers, body,
      maxRetries, timeoutMs, nextRunAt,
    },
  })

  logger.info({ jobId: job.id, userId, scheduleKind }, 'scheduled job created')
  res.status(201).json({ job })
})

mercob.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const jobs = await prisma.scheduledJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      function: { select: { id: true, name: true, status: true } },
      runs: { orderBy: { createdAt: 'desc' }, take: 1, select: { status: true, finishedAt: true } },
    },
  })
  res.json({ jobs })
})

mercob.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const job = await prisma.scheduledJob.findFirst({
    where: { id: req.params['id'], userId },
    include: { function: { select: { id: true, name: true, status: true } } },
  })
  if (!job) return void res.status(404).json({ error: 'Not found' })
  res.json({ job })
})

mercob.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const existing = await prisma.scheduledJob.findFirst({ where: { id: req.params['id'], userId } })
  if (!existing) return void res.status(404).json({ error: 'Not found' })

  const {
    name, active, recurring,
    scheduleKind, timeOfDay, daysOfWeek, intervalSec, cronExpr, runAt,
    method, path, query, headers, body,
    maxRetries, timeoutMs,
  } = req.body as Partial<{
    name: string; active: boolean; recurring: boolean
    scheduleKind: ScheduleKind; timeOfDay: string; daysOfWeek: number[]
    intervalSec: number; cronExpr: string; runAt: string
    method: string; path: string; query: Record<string, string>
    headers: Record<string, string>; body: string
    maxRetries: number; timeoutMs: number
  }>

  const newKind = scheduleKind ?? existing.scheduleKind
  const jobShape = {
    scheduleKind: newKind,
    timeOfDay: timeOfDay ?? existing.timeOfDay,
    daysOfWeek: daysOfWeek ?? existing.daysOfWeek,
    intervalSec: intervalSec ?? existing.intervalSec,
    cronExpr: cronExpr ?? existing.cronExpr,
    runAt: runAt ? new Date(runAt) : existing.runAt,
  }

  const recompute = scheduleKind || timeOfDay || daysOfWeek || intervalSec || cronExpr || runAt
  const nextRunAt = recompute ? computeNextRunAt(jobShape) : undefined

  const updated = await prisma.scheduledJob.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(active !== undefined && { active }),
      ...(recurring !== undefined && { recurring }),
      ...(scheduleKind !== undefined && { scheduleKind }),
      ...(timeOfDay !== undefined && { timeOfDay }),
      ...(daysOfWeek !== undefined && { daysOfWeek }),
      ...(intervalSec !== undefined && { intervalSec }),
      ...(cronExpr !== undefined && { cronExpr }),
      ...(runAt !== undefined && { runAt: new Date(runAt) }),
      ...(method !== undefined && { method }),
      ...(path !== undefined && { path }),
      ...(query !== undefined && { query }),
      ...(headers !== undefined && { headers }),
      ...(body !== undefined && { body }),
      ...(maxRetries !== undefined && { maxRetries }),
      ...(timeoutMs !== undefined && { timeoutMs }),
      ...(nextRunAt != null && { nextRunAt }),
    },
  })
  res.json({ job: updated })
})

mercob.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const job = await prisma.scheduledJob.findFirst({ where: { id: req.params['id'], userId } })
  if (!job) return void res.status(404).json({ error: 'Not found' })
  await prisma.scheduledJob.delete({ where: { id: job.id } })
  logger.info({ jobId: job.id, userId }, 'scheduled job deleted')
  res.json({ ok: true })
})

mercob.post('/:id/trigger', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const job = await prisma.scheduledJob.findFirst({ where: { id: req.params['id'], userId } })
  if (!job) return void res.status(404).json({ error: 'Not found' })

  const run = await prisma.jobRun.create({
    data: { jobId: job.id, status: 'QUEUED', scheduledFor: new Date(), attempt: 1 },
  })

  await mercioInvocations.add('invoke', {
    id: job.functionId,
    runId: run.id,
    method: job.method,
    path: job.path,
    query: (job.query as Record<string, string>) ?? {},
    headers: (job.headers as Record<string, string>) ?? {},
    body: job.body ?? null,
  })

  logger.info({ jobId: job.id, runId: run.id, userId }, 'manual trigger queued')
  res.status(202).json({ runId: run.id })
})

mercob.get('/:id/runs', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const job = await prisma.scheduledJob.findFirst({ where: { id: req.params['id'], userId } })
  if (!job) return void res.status(404).json({ error: 'Not found' })

  const page = Math.max(1, Number(req.query['page'] ?? 1))
  const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)))
  const runs = await prisma.jobRun.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true, attempt: true, status: true, scheduledFor: true,
      startedAt: true, finishedAt: true, durationMs: true,
      httpStatus: true, errorMessage: true, createdAt: true,
    },
  })
  const total = await prisma.jobRun.count({ where: { jobId: job.id } })
  res.json({ runs, total, page, limit })
})

export default mercob

// exported for use inside internal.ts
export { computeNextRunAt }
