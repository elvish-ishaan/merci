import { Router, type Request, type Response } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const mercobRuns = Router()

mercobRuns.get('/:runId', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const run = await prisma.jobRun.findFirst({
    where: {
      id: req.params['runId'],
      job: { userId },
    },
    include: {
      logs: { orderBy: { createdAt: 'asc' } },
      job: { select: { id: true, name: true, functionId: true } },
    },
  })
  if (!run) return void res.status(404).json({ error: 'Not found' })
  res.json({ run })
})

export default mercobRuns
