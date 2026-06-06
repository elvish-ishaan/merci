import type { ServerWebSocket } from 'bun'
import { jwtVerify } from 'jose'
import prisma from '@repo/db'
import { redisSub, runSubscribers } from './redis'
import { logger } from './lib/logger'

const secret = new TextEncoder().encode(process.env['JWT_SECRET']!)

function runIdFromUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  const pathParts = url.pathname.split('/')
  return pathParts[pathParts.length - 1] ?? ''
}

export async function handleActionOpen(ws: ServerWebSocket<string>): Promise<void> {
  const url = new URL(ws.data)
  const runId = runIdFromUrl(ws.data)
  const token = url.searchParams.get('token') ?? ''

  if (!runId || !token) {
    ws.close(1008, 'Missing runId or token')
    return
  }

  let userId: string
  try {
    const { payload } = await jwtVerify(token, secret)
    userId = payload['userId'] as string
  } catch {
    ws.close(1008, 'Invalid token')
    return
  }

  // Verify the run exists and the user owns it (via repo ownership)
  const run = await prisma.actionRun.findFirst({
    where: { id: runId, repo: { userId } },
    select: {
      id: true,
      status: true,
      conclusion: true,
      startedAt: true,
      completedAt: true,
      jobs: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          status: true,
          conclusion: true,
          startedAt: true,
          completedAt: true,
          steps: {
            orderBy: { number: 'asc' },
            select: { id: true, status: true, conclusion: true, startedAt: true, completedAt: true },
          },
        },
      },
    },
  })

  if (!run) {
    ws.close(1008, 'Run not found or access denied')
    return
  }

  // Register before replay so no live message is missed
  if (!runSubscribers.has(runId)) {
    runSubscribers.set(runId, new Set())
  }
  const clients = runSubscribers.get(runId)!
  clients.add(ws)

  if (clients.size === 1) {
    await redisSub.subscribe(`action:run:${runId}`)
    logger.debug({ runId }, 'action run channel subscribed')
  }

  logger.debug({ runId, userId, jobCount: run.jobs.length }, 'ws client connected to action run, replaying state')

  // Replay current run/job/step status so the UI syncs immediately.
  // Logs are not replayed here — the client lazy-loads them per step over HTTP.
  ws.send(JSON.stringify({
    type: 'run-status',
    status: run.status,
    conclusion: run.conclusion,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  }))

  for (const job of run.jobs) {
    ws.send(JSON.stringify({
      type: 'job-status',
      jobId: job.id,
      status: job.status,
      conclusion: job.conclusion,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }))
    for (const step of job.steps) {
      ws.send(JSON.stringify({
        type: 'step-status',
        stepId: step.id,
        status: step.status,
        conclusion: step.conclusion,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
      }))
    }
  }
}

export function handleActionClose(ws: ServerWebSocket<string>): void {
  const runId = runIdFromUrl(ws.data)

  const clients = runSubscribers.get(runId)
  if (!clients) return

  clients.delete(ws)
  logger.debug({ runId }, 'ws action client disconnected')

  if (clients.size === 0) {
    runSubscribers.delete(runId)
    redisSub.unsubscribe(`action:run:${runId}`).catch(() => {})
    logger.debug({ runId }, 'action run channel unsubscribed')
  }
}
