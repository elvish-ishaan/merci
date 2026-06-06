import { logger } from './logger'

const BASE = (process.env['MERCI_ACTIONS_INTERNAL_URL'] ?? 'http://localhost:3001').replace(/\/$/, '')
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${WORKER_SECRET}`,
}

async function patch(path: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      logger.warn({ path, status: res.status }, 'internal API patch failed')
    }
  } catch (err) {
    logger.warn({ err, path }, 'internal API patch error')
  }
}

export async function postLog(stepId: string, line: string, stream: 'stdout' | 'stderr') {
  try {
    const res = await fetch(`${BASE}/internal/action-logs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ stepId, line, stream }),
    })
    if (!res.ok) {
      // Surface auth/config failures instead of silently dropping every line
      logger.warn({ stepId, status: res.status }, 'internal API postLog failed')
    }
  } catch (err) {
    logger.warn({ err, stepId }, 'internal API postLog error')
  }
}

export async function patchStep(stepId: string, data: {
  status?: string
  conclusion?: string
  startedAt?: string
  completedAt?: string
}) {
  await patch(`/internal/action-steps/${stepId}`, data)
}

export async function patchJob(jobId: string, data: {
  status?: string
  conclusion?: string
  startedAt?: string
  completedAt?: string
}) {
  await patch(`/internal/action-jobs/${jobId}`, data)
}

export async function patchRun(runId: string, data: {
  status?: string
  conclusion?: string
  startedAt?: string
  completedAt?: string
}) {
  await patch(`/internal/action-runs/${runId}`, data)
}
