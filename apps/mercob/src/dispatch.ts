import { Queue, QueueEvents } from 'bullmq'
import prisma from '@repo/db'
import { logger } from './lib/logger'
import { computeNextRunAt } from './schedule'
import type { ScheduledJob } from '@repo/db'

const API_BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

const invocationsQueue = new Queue('mercio-invocations', { connection: redisConnection })
const queueEvents = new QueueEvents('mercio-invocations', { connection: redisConnection })

async function patchRun(runId: string, data: Record<string, unknown>) {
  try {
    await fetch(`${API_BASE}/internal/job-runs/${runId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify(data),
    })
  } catch {
    // non-fatal
  }
}

async function postLog(runId: string, line: string, stream: 'stdout' | 'stderr' = 'stdout') {
  try {
    await fetch(`${API_BASE}/internal/job-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ runId, line, stream }),
    })
  } catch {
    // non-fatal
  }
}

export async function dispatch(job: ScheduledJob): Promise<void> {
  const scheduledFor = job.nextRunAt
  let runId: string | null = null

  try {
    const run = await prisma.jobRun.create({
      data: { jobId: job.id, status: 'QUEUED', scheduledFor, attempt: 1 },
    })
    runId = run.id
  } catch (err) {
    logger.error({ jobId: job.id, err }, 'failed to create JobRun')
    return
  }

  const maxAttempts = job.maxRetries + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = new Date()

    await patchRun(runId, { status: 'RUNNING', startedAt: startedAt.toISOString(), attempt })
    await postLog(runId, `[mercob] attempt ${attempt}/${maxAttempts} starting`)

    try {
      const delay = attempt === 1 ? Math.max(0, scheduledFor.getTime() - Date.now()) : 0

      const bqJob = await invocationsQueue.add(
        'invoke',
        {
          id: job.functionId,
          runId,
          method: job.method,
          path: job.path,
          query: (job.query as Record<string, string>) ?? {},
          headers: (job.headers as Record<string, string>) ?? {},
          body: job.body ?? null,
          timeoutMs: job.timeoutMs,
        },
        { delay, jobId: undefined },
      )

      // Add 30s buffer over the job's own timeout so the worker can fail cleanly
      // before waitUntilFinished gives up with "no finish notification"
      const result = await bqJob.waitUntilFinished(queueEvents, job.timeoutMs + 30_000) as {
        status: number
        headers: Record<string, string>
        body: string
      }

      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()

      await patchRun(runId, {
        status: 'SUCCEEDED',
        httpStatus: result.status,
        responseBody: result.body,
        finishedAt: finishedAt.toISOString(),
        durationMs,
      })
      await postLog(runId, `[mercob] completed — HTTP ${result.status} in ${durationMs}ms`)
      logger.info({ jobId: job.id, runId, httpStatus: result.status, durationMs }, 'job run succeeded')
      break
    } catch (err: any) {
      const isTimeout = err?.message?.includes('timeout') || err?.message?.includes('Timed out')
      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()

      if (attempt === maxAttempts) {
        const finalStatus = isTimeout ? 'TIMEOUT' : 'FAILED'
        await patchRun(runId, {
          status: finalStatus,
          errorMessage: err?.message ?? String(err),
          finishedAt: finishedAt.toISOString(),
          durationMs,
        })
        await postLog(runId, `[mercob] ${finalStatus} — ${err?.message ?? err}`, 'stderr')
        logger.warn({ jobId: job.id, runId, attempt, err }, 'job run exhausted retries')
      } else {
        logger.warn({ jobId: job.id, runId, attempt, err }, 'job run attempt failed, retrying')
        await postLog(runId, `[mercob] attempt ${attempt} failed: ${err?.message ?? err}`, 'stderr')
      }
    }
  }

  // Advance schedule
  const now = new Date()
  if (job.recurring) {
    const nextRunAt = computeNextRunAt(job, now)
    if (nextRunAt) {
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { nextRunAt, lastRunAt: now },
      })
    } else {
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { active: false, lastRunAt: now },
      })
    }
  } else {
    // one-shot — deactivate
    await prisma.scheduledJob.update({
      where: { id: job.id },
      data: { active: false, lastRunAt: now },
    })
  }
}
