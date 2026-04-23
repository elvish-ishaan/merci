import { Worker } from 'bullmq'
import { ensure } from './workerdPool'
import { logger } from './lib/logger'

export interface InvokePayload {
  id: string
  runId?: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: string | null
  remoteAddr?: string
  timeoutMs?: number
}

export interface InvokeResult {
  status: number
  headers: Record<string, string>
  body: string
}

function buildQs(query: Record<string, string>): string {
  const params = new URLSearchParams(query)
  const s = params.toString()
  return s ? `?${s}` : ''
}

const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

const API_BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

async function postJobLog(runId: string, line: string, stream: 'stdout' | 'stderr') {
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

export function createRuntimeWorker() {
  const worker = new Worker<InvokePayload, InvokeResult>(
    'mercio-invocations',
    async (job) => {
      const { id, runId, method, path, query, body, timeoutMs } = job.data
      // headers excluded from log — may contain Authorization from the caller
      logger.debug({ functionId: id, method, path }, 'invoking function')

      const deadline = timeoutMs ?? 30_000
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), deadline)

      try {
        const { port } = await ensure(id)
        const url = `http://127.0.0.1:${port}${path}${buildQs(query)}`

        const res = await fetch(url, {
          method,
          headers: job.data.headers as Record<string, string>,
          body: method !== 'GET' && method !== 'HEAD' ? body ?? undefined : undefined,
          signal: ac.signal,
        })

        const responseBody = await res.text()
        const responseHeaders: Record<string, string> = {}
        res.headers.forEach((v, k) => {
          responseHeaders[k] = v
        })

        if (runId) {
          void postJobLog(runId, `HTTP ${res.status} — ${responseBody.slice(0, 500)}`, 'stdout')
        }

        return {
          status: res.status,
          headers: responseHeaders,
          body: responseBody,
        }
      } finally {
        clearTimeout(timer)
      }
    },
    {
      connection: redisConnection,
      concurrency: 8,
      lockDuration: 5 * 60 * 1000,
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'invocation job failed')
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'invocation job completed')
  })

  return worker
}
