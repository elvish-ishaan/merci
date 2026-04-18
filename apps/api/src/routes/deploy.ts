import { Router } from 'express'
import { Queue } from 'bullmq'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

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
  const { repoUrl, projectName } = req.body as { repoUrl?: string; projectName?: string }

  if (!repoUrl) {
    res.status(400).json({ error: 'repoUrl is required' })
    return
  }

  const project = await prisma.project.create({
    data: {
      userId,
      repoUrl,
      projectName: projectName ?? repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'project',
      status: 'QUEUED',
    },
  })

  await deployQueue.add('deploy', { projectId: project.id, repoUrl })

  res.json({
    projectId: project.id,
    status: project.status,
    projectName: project.projectName,
    bucketPrefix: project.bucketPrefix,
    deployedUrl: project.deployedUrl,
  })
})

export default deploy
