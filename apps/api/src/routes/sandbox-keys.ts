import { Router, type Request, type Response } from 'express'
import { createHash, randomBytes } from 'crypto'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { logger } from '../lib/logger'

const sandboxKeys = Router()

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function generateKey(): string {
  return `sk_sandbox_${randomBytes(24).toString('base64url')}`
}

// GET /api/sandbox/keys
sandboxKeys.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string

  const keys = await prisma.sandboxApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
  })

  res.json({ keys })
})

// POST /api/sandbox/keys
sandboxKeys.post('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { name } = req.body as { name?: string }

  if (!name?.trim()) {
    res.status(400).json({ error: '`name` is required' })
    return
  }

  const count = await prisma.sandboxApiKey.count({ where: { userId } })
  if (count >= 10) {
    res.status(400).json({ error: 'Maximum of 10 API keys per user' })
    return
  }

  const plainKey = generateKey()
  const keyHash = hashKey(plainKey)
  const keyPrefix = `${plainKey.slice(0, 20)}...`

  const record = await prisma.sandboxApiKey.create({
    data: { userId, name: name.trim(), keyHash, keyPrefix },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  })

  logger.info({ userId, keyId: record.id }, '[sandbox-keys] API key created')

  // plainKey is only returned once — never stored in plain text
  res.status(201).json({ key: record, plainKey })
})

// DELETE /api/sandbox/keys/:id
sandboxKeys.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { id } = req.params

  const record = await prisma.sandboxApiKey.findFirst({ where: { id, userId } })
  if (!record) {
    res.status(404).json({ error: 'Key not found' })
    return
  }

  await prisma.sandboxApiKey.delete({ where: { id } })
  logger.info({ userId, keyId: id }, '[sandbox-keys] API key deleted')

  res.json({ ok: true })
})

export default sandboxKeys
