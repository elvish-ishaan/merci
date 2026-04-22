import { Router } from 'express'
import { Queue, QueueEvents } from 'bullmq'
import prisma from '../lib/prisma'

const mercioInvoke = Router()

const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

const invokeQueue = new Queue('mercio-invocations', { connection: redisConnection })
const queueEvents = new QueueEvents('mercio-invocations', { connection: redisConnection })

async function handleInvoke(
  req: import('express').Request,
  res: import('express').Response,
  id: string
): Promise<void> {
  const fn = await prisma.mercioFunction.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!fn) {
    res.status(404).json({ error: 'Function not found' })
    return
  }

  if (fn.status !== 'DEPLOYED') {
    res.status(409).json({ error: `Function is not deployed (status: ${fn.status})` })
    return
  }

  const subpath = (req.params as any)[0] ?? '/'
  const path = subpath.startsWith('/') ? subpath : `/${subpath}`

  let body: string | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers['content-type'] ?? ''
    if (ct.includes('application/json')) {
      body = JSON.stringify(req.body)
    } else if (typeof req.body === 'string') {
      body = req.body
    }
  }

  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') query[k] = v
  }

  const forwardHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string' && k !== 'host') forwardHeaders[k] = v
  }

  const job = await invokeQueue.add('invoke', {
    id,
    method: req.method,
    path,
    query,
    headers: forwardHeaders,
    body,
    remoteAddr: req.ip,
  })

  let result: { status: number; headers: Record<string, string>; body: string }
  try {
    result = await job.waitUntilFinished(queueEvents, 30_000)
  } catch (err: any) {
    if (err?.message?.includes('timed out')) {
      res.status(504).json({ error: 'Function execution timed out' })
    } else {
      res.status(500).json({ error: 'Function execution failed' })
    }
    return
  }

  const safeHeaders: Record<string, string> = {}
  for (const [k, v] of Object.entries(result.headers ?? {})) {
    if (typeof v === 'string') safeHeaders[k] = v
  }
  res.status(result.status ?? 200).set(safeHeaders).send(result.body ?? '')
}

mercioInvoke.all('/:id', async (req, res) => {
  await handleInvoke(req, res, req.params['id']!)
})

mercioInvoke.all('/:id/*', async (req, res) => {
  await handleInvoke(req, res, req.params['id']!)
})

export default mercioInvoke
