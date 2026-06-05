import { Router, type Request, type Response } from 'express'
import { nanoid } from 'nanoid'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { decryptValue } from '@repo/crypto'
import { fetchWorkflowFiles } from '../lib/github'
import { parseWorkflow } from '../lib/yaml-parser'
import { actionQueue } from '../lib/queue'
import { logger } from '../lib/logger'

const runs = Router()

// List runs for a repo, or all runs for the user
runs.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { repoId, page = '1', limit = '20' } = req.query as Record<string, string>

  const take = Math.min(Number(limit), 100)
  const skip = (Number(page) - 1) * take

  const where = repoId
    ? { repoId, repo: { userId } }
    : { repo: { userId } }

  const [total, items] = await Promise.all([
    prisma.actionRun.count({ where }),
    prisma.actionRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        workflowFile: true,
        event: true,
        ref: true,
        sha: true,
        status: true,
        conclusion: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        repo: { select: { id: true, repoFullName: true } },
        _count: { select: { jobs: true } },
      },
    }),
  ])

  res.json({ runs: items, total, page: Number(page), limit: take })
})

// Run detail with jobs
runs.get('/:runId', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { runId } = req.params

  const run = await prisma.actionRun.findFirst({
    where: { id: runId, repo: { userId } },
    include: {
      repo: { select: { id: true, repoFullName: true } },
      jobs: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          jobKey: true,
          name: true,
          status: true,
          conclusion: true,
          startedAt: true,
          completedAt: true,
          _count: { select: { steps: true } },
        },
      },
    },
  })

  if (!run) {
    res.status(404).json({ error: 'Run not found' })
    return
  }

  res.json({ run })
})

// Job detail with steps
runs.get('/:runId/jobs/:jobId', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { runId, jobId } = req.params

  const job = await prisma.actionJob.findFirst({
    where: { id: jobId, runId, run: { repo: { userId } } },
    include: {
      steps: {
        orderBy: { number: 'asc' },
        select: {
          id: true,
          name: true,
          number: true,
          status: true,
          conclusion: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  })

  if (!job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }

  res.json({ job })
})

// Step logs
runs.get('/:runId/jobs/:jobId/steps/:stepId/logs', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { runId, jobId, stepId } = req.params

  const step = await prisma.actionStep.findFirst({
    where: { id: stepId, jobId, job: { runId, run: { repo: { userId } } } },
    select: { id: true },
  })

  if (!step) {
    res.status(404).json({ error: 'Step not found' })
    return
  }

  const logs = await prisma.actionLog.findMany({
    where: { stepId },
    orderBy: { id: 'asc' },
    select: { id: true, line: true, stream: true, createdAt: true },
  })

  res.json({ logs })
})

// Re-run a workflow at the same SHA
runs.post('/:runId/rerun', authMiddleware, async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string
  const { runId } = req.params

  const existingRun = await prisma.actionRun.findFirst({
    where: { id: runId, repo: { userId } },
    include: {
      repo: {
        include: {
          secrets: { select: { name: true, encryptedValue: true } },
          user: { select: { githubAccessToken: true, email: true } },
        },
      },
    },
  })

  if (!existingRun) {
    res.status(404).json({ error: 'Run not found' })
    return
  }

  if (!existingRun.repo.user.githubAccessToken) {
    res.status(400).json({ error: 'No GitHub token — connect GitHub first' })
    return
  }

  let githubToken: string
  try {
    githubToken = decryptValue(existingRun.repo.user.githubAccessToken)
  } catch {
    res.status(500).json({ error: 'Failed to decrypt GitHub token' })
    return
  }

  // Re-fetch the workflow file at the exact same SHA
  let workflowFiles: Array<{ filename: string; content: string }>
  try {
    workflowFiles = await fetchWorkflowFiles(existingRun.repo.repoFullName, existingRun.sha, githubToken)
  } catch (err: any) {
    logger.error({ err, runId }, '[rerun] failed to fetch workflow files')
    res.status(502).json({ error: `Failed to fetch workflow: ${err?.message}` })
    return
  }

  const wf = workflowFiles.find(f => f.filename === existingRun.workflowFile)
  if (!wf) {
    res.status(404).json({ error: `Workflow file ${existingRun.workflowFile} not found at SHA ${existingRun.sha}` })
    return
  }

  let workflow
  try {
    workflow = parseWorkflow(wf.content)
  } catch (err: any) {
    res.status(422).json({ error: `Failed to parse workflow: ${err?.message}` })
    return
  }

  const actor = existingRun.repo.user.email

  const newRun = await prisma.actionRun.create({
    data: {
      repoId: existingRun.repoId,
      workflowFile: existingRun.workflowFile,
      event: existingRun.event,
      ref: existingRun.ref,
      sha: existingRun.sha,
      status: 'QUEUED',
    },
  })

  for (const [jobKey, jobDef] of Object.entries(workflow.jobs)) {
    const jobName = jobDef.name ?? jobKey
    const runsOn = Array.isArray(jobDef['runs-on'])
      ? jobDef['runs-on'][0] ?? 'ubuntu-latest'
      : jobDef['runs-on'] ?? 'ubuntu-latest'

    const steps = jobDef.steps.map((step, i) => ({
      ...step,
      name: step.name ?? step.uses ?? step.run?.split('\n')[0]?.slice(0, 60) ?? `Step ${i + 1}`,
    }))

    const job = await prisma.actionJob.create({
      data: {
        runId: newRun.id,
        jobKey,
        name: jobName,
        status: 'QUEUED',
        steps: {
          create: [
            { name: 'Set up job', number: -1, status: 'QUEUED' as const },
            ...steps.map((step, i) => ({
              name: step.name ?? `Step ${i + 1}`,
              number: i,
              status: 'QUEUED' as const,
            })),
          ],
        },
      },
    })

    const queueJobId = `${newRun.id}:${job.id}:${nanoid(6)}`
    await actionQueue.add(
      `${newRun.id}:${job.id}`,
      {
        runId: newRun.id,
        jobId: job.id,
        repoFullName: existingRun.repo.repoFullName,
        sha: existingRun.sha,
        ref: existingRun.ref,
        event: existingRun.event,
        runsOn,
        steps: jobDef.steps,
        env: { ...workflow.env, ...jobDef.env },
        secrets: existingRun.repo.secrets,
        encryptedGithubToken: existingRun.repo.user.githubAccessToken,
        actor,
      },
      { jobId: queueJobId },
    )

    logger.info({ runId: newRun.id, jobId: job.id, jobKey }, '[rerun] job enqueued')
  }

  logger.info({ originalRunId: runId, newRunId: newRun.id }, '[rerun] ✓ re-run queued')
  res.json({ run: newRun })
})

export default runs
