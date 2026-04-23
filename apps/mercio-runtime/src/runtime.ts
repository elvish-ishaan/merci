import { Worker } from 'bullmq'
import { ensure } from './workerdPool'
import { logger } from './lib/logger'

export interface InvokePayload {
  id: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: string | null
  remoteAddr?: string
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

export function createRuntimeWorker() {
  const worker = new Worker<InvokePayload, InvokeResult>(
    'mercio-invocations',
    async (job) => {
      const { id, method, path, query, body } = job.data
      // headers excluded from log — may contain Authorization from the caller
      logger.debug({ functionId: id, method, path }, 'invoking function')

      const { port } = await ensure(id)
      const url = `http://127.0.0.1:${port}${path}${buildQs(query)}`

      const res = await fetch(url, {
        method,
        headers: job.data.headers as Record<string, string>,
        body: method !== 'GET' && method !== 'HEAD' ? body ?? undefined : undefined,
      })

      const responseBody = await res.text()
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v
      })

      return {
        status: res.status,
        headers: responseHeaders,
        body: responseBody,
      }
    },
    {
      connection: redisConnection,
      concurrency: 8,
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
