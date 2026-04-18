import { Router, type Request, type Response, type NextFunction } from 'express'
import prisma from '../lib/prisma'
import { redisPub } from '../lib/redis'

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

  res.json({ ok: true })
})

export default internal
