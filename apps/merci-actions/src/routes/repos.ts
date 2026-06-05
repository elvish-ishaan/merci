import { Router, type Request, type Response } from 'express'
import { nanoid } from 'nanoid'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { registerWebhook, updateWebhookUrl, deleteWebhook } from '../lib/github'
import { encryptValue, decryptValue } from '@repo/crypto'
import { logger } from '../lib/logger'

const repos = Router()

const WEBHOOK_BASE_URL = (process.env['MERCI_ACTIONS_URL'] ?? 'http://localhost:3003').replace(/\/$/, '')

// ── Repos ──────────────────────────────────────────────────────────────────

repos.get('/', authMiddleware, async (_req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const rows = await prisma.actionRepo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      repoFullName: true,
      createdAt: true,
      _count: { select: { runs: true } },
    },
  })
  res.json({ repos: rows })
})

repos.post('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoFullName } = req.body as { repoFullName?: string }

  if (!repoFullName?.includes('/')) {
    res.status(400).json({ error: 'repoFullName must be in owner/repo format' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  })

  if (!user?.githubAccessToken) {
    res.status(400).json({ error: 'GitHub account not connected' })
    return
  }

  const existing = await prisma.actionRepo.findUnique({
    where: { userId_repoFullName: { userId, repoFullName } },
  })
  if (existing) {
    res.status(409).json({ error: 'Repo already registered' })
    return
  }

  const webhookSecret = nanoid(32)
  const githubToken = decryptValue(user.githubAccessToken)

  // Create the DB record first so we have the repoId for the webhook URL
  const repo = await prisma.actionRepo.create({
    data: { userId, repoFullName, webhookSecret },
    select: { id: true, repoFullName: true, createdAt: true },
  })

  // Register webhook with the correct URL (includes repoId)
  try {
    const webhookId = await registerWebhook(
      repoFullName,
      `${WEBHOOK_BASE_URL}/webhook/${repo.id}`,
      webhookSecret,
      githubToken,
    )
    await prisma.actionRepo.update({ where: { id: repo.id }, data: { webhookId } })
    logger.info({ userId, repoFullName, repoId: repo.id, webhookId }, 'repo registered')
  } catch (err) {
    logger.warn({ err, repoFullName, repoId: repo.id }, 'webhook registration failed — repo saved, webhook must be configured manually')
  }

  res.status(201).json({ repo })
})

repos.get('/:repoId', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoId } = req.params

  const repo = await prisma.actionRepo.findFirst({
    where: { id: repoId, userId },
    select: {
      id: true,
      repoFullName: true,
      createdAt: true,
      _count: { select: { runs: true, secrets: true } },
    },
  })

  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  res.json({ repo })
})

// Re-registers the webhook with the correct URL — useful when MERCI_ACTIONS_URL changes
// or to fix repos registered before the bug fix
repos.post('/:repoId/webhook/sync', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoId } = req.params

  const repo = await prisma.actionRepo.findFirst({ where: { id: repoId, userId } })
  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubAccessToken: true },
  })
  if (!user?.githubAccessToken) {
    res.status(400).json({ error: 'GitHub account not connected' })
    return
  }

  const githubToken = decryptValue(user.githubAccessToken)
  const webhookUrl = `${WEBHOOK_BASE_URL}/webhook/${repo.id}`

  try {
    if (repo.webhookId) {
      // Update the existing webhook URL
      await updateWebhookUrl(repo.repoFullName, repo.webhookId, webhookUrl, githubToken)
      logger.info({ repoId, webhookId: repo.webhookId, webhookUrl }, 'webhook URL updated')
    } else {
      // No webhook yet — create one
      const webhookId = await registerWebhook(repo.repoFullName, webhookUrl, repo.webhookSecret, githubToken)
      await prisma.actionRepo.update({ where: { id: repo.id }, data: { webhookId } })
      logger.info({ repoId, webhookId, webhookUrl }, 'webhook registered')
    }
    res.json({ ok: true, webhookUrl })
  } catch (err: any) {
    logger.error({ err, repoId }, 'webhook sync failed')
    res.status(502).json({ error: err?.message ?? 'Webhook sync failed' })
  }
})

repos.delete('/:repoId', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoId } = req.params

  const repo = await prisma.actionRepo.findFirst({ where: { id: repoId, userId } })
  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  if (repo.webhookId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    })
    if (user?.githubAccessToken) {
      const token = decryptValue(user.githubAccessToken)
      await deleteWebhook(repo.repoFullName, repo.webhookId, token).catch(() => {})
    }
  }

  await prisma.actionRepo.delete({ where: { id: repoId } })
  logger.info({ userId, repoId }, 'repo unregistered')
  res.json({ ok: true })
})

// ── Secrets ────────────────────────────────────────────────────────────────

repos.get('/:repoId/secrets', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoId } = req.params

  const repo = await prisma.actionRepo.findFirst({ where: { id: repoId, userId }, select: { id: true } })
  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  const secrets = await prisma.actionSecret.findMany({
    where: { repoId },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
    orderBy: { name: 'asc' },
  })

  res.json({ secrets })
})

repos.put('/:repoId/secrets/:name', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const repoId = req.params['repoId'] as string
  const secretName = (req.params['name'] as string).toUpperCase()
  const { value } = req.body as { value?: string }

  if (!value) {
    res.status(400).json({ error: 'value is required' })
    return
  }

  const repo = await prisma.actionRepo.findFirst({ where: { id: repoId, userId }, select: { id: true } })
  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  const secret = await prisma.actionSecret.upsert({
    where: { repoId_name: { repoId: repo.id, name: secretName } },
    create: { repoId: repo.id, name: secretName, encryptedValue: encryptValue(value) },
    update: { encryptedValue: encryptValue(value) },
    select: { id: true, name: true, updatedAt: true },
  })

  res.json({ secret })
})

repos.delete('/:repoId/secrets/:name', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const repoId = req.params['repoId'] as string
  const secretName = (req.params['name'] as string).toUpperCase()

  const repo = await prisma.actionRepo.findFirst({ where: { id: repoId, userId }, select: { id: true } })
  if (!repo) {
    res.status(404).json({ error: 'Repo not found' })
    return
  }

  await prisma.actionSecret.deleteMany({ where: { repoId: repo.id, name: secretName } })
  res.json({ ok: true })
})

export default repos
