import { Router } from 'express'
import { Queue } from 'bullmq'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { encryptValue, decryptValue } from '@repo/crypto'
import { generateUniqueSubdomain } from '../lib/subdomain'
import { logger } from '../lib/logger'

const deploy = Router()

const deployQueue = new Queue('deployments', {
  connection: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
  },
})

deploy.get('/', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      projectName: true,
      repoUrl: true,
      status: true,
      bucketPrefix: true,
      deployedUrl: true,
      subdomain: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  res.json({ projects })
})

deploy.post('/', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const {
    repoUrl,
    projectName,
    envVars = [],
  } = req.body as {
    repoUrl?: string
    projectName?: string
    envVars?: { key: string; value: string }[]
  }

  if (!repoUrl) {
    res.status(400).json({ error: 'repoUrl is required' })
    return
  }

  const validEnvVars = envVars.filter((v) => v.key && v.key.trim().length > 0)
  if (validEnvVars.length > 50) {
    res.status(400).json({ error: 'Maximum 50 environment variables allowed' })
    return
  }

  const subdomain = await generateUniqueSubdomain()

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        userId,
        repoUrl,
        projectName: projectName ?? repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'project',
        status: 'QUEUED',
        subdomain,
      },
    })

    if (validEnvVars.length > 0) {
      await tx.envVar.createMany({
        data: validEnvVars.map((v) => ({
          projectId: created.id,
          key: v.key.trim(),
          encryptedValue: encryptValue(v.value),
        })),
      })
    }

    return created
  })

  const encryptedEnvVars = validEnvVars.map((v) => ({
    key: v.key.trim(),
    encryptedValue: encryptValue(v.value),
  }))

  // Decrypt and pass the GitHub token so the worker can clone private repos
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { githubAccessToken: true } })
  const githubToken = user?.githubAccessToken ? decryptValue(user.githubAccessToken) : undefined

  await deployQueue.add('deploy', { projectId: project.id, repoUrl, encryptedEnvVars, githubToken })

  logger.debug({ projectId: project.id, userId, envVarCount: validEnvVars.length }, 'deploy job queued')

  res.json({
    projectId: project.id,
    status: project.status,
    projectName: project.projectName,
    bucketPrefix: project.bucketPrefix,
    deployedUrl: project.deployedUrl,
    subdomain: project.subdomain,
  })
})

// GET /deploy/:projectId — single project detail
deploy.get('/:projectId', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      projectName: true,
      repoUrl: true,
      status: true,
      bucketPrefix: true,
      deployedUrl: true,
      subdomain: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { envVars: true } },
    },
  })

  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const { _count, ...rest } = project
  res.json({ project: { ...rest, envVarCount: _count.envVars } })
})

// PATCH /deploy/:projectId — rename project
deploy.patch('/:projectId', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }
  const { projectName } = req.body as { projectName?: string }

  if (!projectName?.trim()) {
    res.status(400).json({ error: 'projectName is required' })
    return
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { projectName: projectName.trim() },
    select: { id: true, projectName: true, status: true, updatedAt: true },
  })

  res.json({ project: updated })
})

// DELETE /deploy/:projectId — delete project
deploy.delete('/:projectId', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  await prisma.project.delete({ where: { id: projectId } })
  res.json({ ok: true })
})

// POST /deploy/:projectId/redeploy — re-queue deployment with existing env vars
deploy.post('/:projectId/redeploy', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { envVars: { select: { key: true, encryptedValue: true } } },
  })

  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: 'QUEUED' } })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { githubAccessToken: true } })
  const githubToken = user?.githubAccessToken ? decryptValue(user.githubAccessToken) : undefined

  await deployQueue.add('deploy', {
    projectId,
    repoUrl: project.repoUrl,
    encryptedEnvVars: project.envVars,
    githubToken,
  })

  logger.debug({ projectId, userId }, 'redeploy job queued')
  res.json({ ok: true, status: 'QUEUED' })
})

// GET /deploy/:projectId/env — list env var keys (no values)
deploy.get('/:projectId/env', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const envVars = await prisma.envVar.findMany({
    where: { projectId },
    select: { id: true, key: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ envVars })
})

// POST /deploy/:projectId/env — add or update an env var
deploy.post('/:projectId/env', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId } = req.params as { projectId: string }
  const { key, value } = req.body as { key?: string; value?: string }

  if (!key?.trim()) {
    res.status(400).json({ error: 'key is required' })
    return
  }
  if (value === undefined) {
    res.status(400).json({ error: 'value is required' })
    return
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const trimmedKey = key.trim()
  const encryptedValue = encryptValue(value)
  const existing = await prisma.envVar.findFirst({ where: { projectId, key: trimmedKey } })

  if (existing) {
    await prisma.envVar.update({ where: { id: existing.id }, data: { encryptedValue } })
  } else {
    await prisma.envVar.create({ data: { projectId, key: trimmedKey, encryptedValue } })
  }

  res.json({ ok: true })
})

// DELETE /deploy/:projectId/env/:key — delete an env var by key name
deploy.delete('/:projectId/env/:key', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const { projectId, key } = req.params as { projectId: string; key: string }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const envVar = await prisma.envVar.findFirst({ where: { projectId, key } })
  if (!envVar) {
    res.status(404).json({ error: 'Environment variable not found' })
    return
  }

  await prisma.envVar.delete({ where: { id: envVar.id } })
  res.json({ ok: true })
})

export default deploy
