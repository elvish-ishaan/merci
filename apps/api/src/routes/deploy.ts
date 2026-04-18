import { Router } from 'express'
import { Queue } from 'bullmq'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { encryptValue } from '@repo/crypto'

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

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        userId,
        repoUrl,
        projectName: projectName ?? repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'project',
        status: 'QUEUED',
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

  await deployQueue.add('deploy', { projectId: project.id, repoUrl, encryptedEnvVars })

  res.json({
    projectId: project.id,
    status: project.status,
    projectName: project.projectName,
    bucketPrefix: project.bucketPrefix,
    deployedUrl: project.deployedUrl,
  })
})

export default deploy
