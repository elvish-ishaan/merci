import { Router, type Request, type Response } from 'express'
import { nanoid } from 'nanoid'
import prisma from '../lib/prisma'
import { verifyWebhookSignature } from '../lib/hmac'
import { fetchWorkflowFiles } from '../lib/github'
import { parseWorkflow } from '../lib/yaml-parser'
import {
  matchesTrigger,
  buildContextFromPush,
  buildContextFromPullRequest,
  type PushPayload,
  type PullRequestPayload,
} from '../lib/trigger'
import { actionQueue } from '../lib/queue'
import { decryptValue } from '@repo/crypto'
import { logger } from '../lib/logger'

const webhook = Router()

webhook.post('/:repoId', async (req: Request, res: Response) => {
  const repoId = req.params['repoId'] as string
  const signature = req.headers['x-hub-signature-256'] as string | undefined
  const event = req.headers['x-github-event'] as string | undefined
  const delivery = req.headers['x-github-delivery'] as string | undefined
  const rawBody = req.body as Buffer

  logger.info({ repoId, event, delivery, bodyBytes: rawBody?.length ?? 0 }, '[webhook] ▶ received')

  // ── 1. Header validation ───────────────────────────────────────────────────
  if (!signature || !event) {
    logger.warn({ repoId, hasSignature: !!signature, hasEvent: !!event }, '[webhook] ✗ missing required headers')
    res.status(400).json({ error: 'Missing GitHub webhook headers' })
    return
  }

  if (!(rawBody instanceof Buffer) || rawBody.length === 0) {
    logger.warn({ repoId, bodyType: typeof rawBody }, '[webhook] ✗ body is not a raw Buffer — check express.raw() middleware order')
    res.status(400).json({ error: 'Raw body missing' })
    return
  }

  // ── 2. Repo lookup ─────────────────────────────────────────────────────────
  logger.debug({ repoId }, '[webhook] looking up repo in DB')
  const repo = await prisma.actionRepo.findUnique({
    where: { id: repoId },
    include: {
      secrets: { select: { name: true, encryptedValue: true } },
      user: { select: { githubAccessToken: true } },
    },
  })

  if (!repo) {
    logger.warn({ repoId }, '[webhook] ✗ repo not found in DB')
    res.status(404).json({ error: 'Repo not found' })
    return
  }
  logger.debug({ repoId, repoFullName: repo.repoFullName, secretCount: repo.secrets.length }, '[webhook] ✓ repo found')

  // ── 3. Signature verification ──────────────────────────────────────────────
  logger.debug({ repoId }, '[webhook] verifying HMAC signature')
  const signatureValid = verifyWebhookSignature(rawBody, repo.webhookSecret, signature)
  if (!signatureValid) {
    logger.warn({ repoId, signature: signature.slice(0, 20) + '…' }, '[webhook] ✗ signature mismatch — wrong webhookSecret or body tampered')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }
  logger.debug({ repoId }, '[webhook] ✓ signature valid')

  // ── 4. Event filter ────────────────────────────────────────────────────────
  if (event !== 'push' && event !== 'pull_request') {
    logger.info({ repoId, event }, '[webhook] ✓ event ignored (only push/pull_request are processed)')
    res.status(200).json({ ok: true, skipped: true })
    return
  }

  // ── 5. Payload parsing ─────────────────────────────────────────────────────
  let payload: PushPayload | PullRequestPayload
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as PushPayload | PullRequestPayload
  } catch (err) {
    logger.error({ err, repoId }, '[webhook] ✗ failed to parse JSON body')
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }

  let sha: string
  let ref: string
  let actor: string
  let ctx: ReturnType<typeof buildContextFromPush>

  if (event === 'push') {
    const p = payload as PushPayload
    logger.debug({ repoId, ref: p.ref, after: p.after, pusher: p.pusher?.name }, '[webhook] push payload parsed')

    if (p.after === '0000000000000000000000000000000000000000') {
      logger.info({ repoId, ref: p.ref }, '[webhook] ✓ branch deletion push — skipping')
      res.status(200).json({ ok: true, skipped: true })
      return
    }

    sha = p.after
    ref = p.ref
    actor = p.pusher?.name ?? 'unknown'
    ctx = buildContextFromPush(p)
    logger.info({ repoId, sha, ref, actor, branch: ctx.branch, tag: ctx.tag }, '[webhook] ✓ push context built')
  } else {
    const p = payload as PullRequestPayload
    logger.debug({ repoId, action: p.action, headSha: p.pull_request.head.sha, headRef: p.pull_request.head.ref }, '[webhook] pull_request payload parsed')

    sha = p.pull_request.head.sha
    ref = `refs/pull/${(p as any).number}/head`
    actor = p.sender?.login ?? 'unknown'
    ctx = buildContextFromPullRequest(p)
    logger.info({ repoId, sha, ref, actor, branch: ctx.branch, prAction: ctx.prAction }, '[webhook] ✓ pull_request context built')
  }

  // ── 6. GitHub token ────────────────────────────────────────────────────────
  if (!repo.user.githubAccessToken) {
    logger.warn({ repoId }, '[webhook] ✗ user has no githubAccessToken — connect GitHub first')
    res.status(200).json({ ok: true, skipped: true })
    return
  }

  let githubToken: string
  try {
    githubToken = decryptValue(repo.user.githubAccessToken)
    logger.debug({ repoId }, '[webhook] ✓ github token decrypted')
  } catch (err) {
    logger.error({ err, repoId }, '[webhook] ✗ failed to decrypt github token — ENV_ENCRYPTION_KEY mismatch?')
    res.status(500).json({ error: 'Failed to decrypt GitHub token' })
    return
  }

  // ── 7. Fetch workflow files ────────────────────────────────────────────────
  logger.info({ repoId, repoFullName: repo.repoFullName, sha }, '[webhook] fetching .github/workflows/*.yml from GitHub API')
  let workflowFiles: Array<{ filename: string; content: string }>
  try {
    workflowFiles = await fetchWorkflowFiles(repo.repoFullName, sha, githubToken)
    logger.info({ repoId, sha, count: workflowFiles.length, files: workflowFiles.map(f => f.filename) }, '[webhook] ✓ workflow files fetched')
  } catch (err) {
    logger.error({ err, repoId, sha }, '[webhook] ✗ failed to fetch workflow files from GitHub API')
    res.status(500).json({ error: 'Failed to fetch workflow files' })
    return
  }

  if (workflowFiles.length === 0) {
    logger.warn({ repoId, sha }, '[webhook] no .github/workflows/*.yml files found at this commit')
    res.status(200).json({ ok: true, queued: 0 })
    return
  }

  // ── 8. Parse & match each workflow ────────────────────────────────────────
  const queued: string[] = []

  for (const { filename, content } of workflowFiles) {
    logger.debug({ repoId, filename }, '[webhook] parsing workflow YAML')

    let workflow
    try {
      workflow = parseWorkflow(content)
      logger.debug({
        repoId,
        filename,
        workflowName: workflow.name,
        triggers: Object.keys(workflow.triggers),
        jobCount: Object.keys(workflow.jobs).length,
      }, '[webhook] ✓ workflow parsed')
    } catch (err) {
      logger.warn({ err, repoId, filename }, '[webhook] ✗ failed to parse workflow YAML — skipping')
      continue
    }

    // ── 9. Trigger matching ─────────────────────────────────────────────────
    const triggered = matchesTrigger(workflow.triggers, ctx)
    logger.info({
      repoId,
      filename,
      event: ctx.event,
      branch: ctx.branch,
      tag: ctx.tag,
      workflowTriggers: workflow.triggers,
      triggered,
    }, triggered ? '[webhook] ✓ trigger matched' : '[webhook] — trigger did not match, skipping')

    if (!triggered) continue

    // ── 10. Create DB records ───────────────────────────────────────────────
    const run = await prisma.actionRun.create({
      data: { repoId, workflowFile: filename, event, ref, sha, status: 'QUEUED' },
    })
    logger.info({ repoId, runId: run.id, filename }, '[webhook] ✓ ActionRun created')

    for (const [jobKey, jobDef] of Object.entries(workflow.jobs)) {
      const jobName = jobDef.name ?? jobKey
      const runsOn = Array.isArray(jobDef['runs-on'])
        ? jobDef['runs-on'][0] ?? 'ubuntu-latest'
        : jobDef['runs-on'] ?? 'ubuntu-latest'

      logger.debug({ repoId, runId: run.id, jobKey, jobName, runsOn, stepCount: jobDef.steps.length }, '[webhook] creating job')

      const steps = jobDef.steps.map((step, i) => ({
        ...step,
        name: step.name ?? step.uses ?? step.run?.split('\n')[0]?.slice(0, 60) ?? `Step ${i + 1}`,
      }))

      const job = await prisma.actionJob.create({
        data: {
          runId: run.id,
          jobKey,
          name: jobName,
          status: 'QUEUED',
          steps: {
            create: [
              // number: -1 is the implicit setup step (clone, pull, container)
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
      logger.info({ repoId, runId: run.id, jobId: job.id, jobKey }, '[webhook] ✓ ActionJob + steps created')

      // ── 11. Enqueue ───────────────────────────────────────────────────────
      const mergedEnv = { ...workflow.env, ...jobDef.env }
      const queueJobId = `${run.id}:${job.id}:${nanoid(6)}`

      await actionQueue.add(
        `${run.id}:${job.id}`,
        {
          runId: run.id,
          jobId: job.id,
          repoFullName: repo.repoFullName,
          sha,
          ref,
          event,
          runsOn,
          steps: jobDef.steps,
          env: mergedEnv,
          secrets: repo.secrets,
          encryptedGithubToken: repo.user.githubAccessToken,
          actor,
        },
        { jobId: queueJobId },
      )
      logger.info({ repoId, runId: run.id, jobId: job.id, queueJobId }, '[webhook] ✓ job enqueued to merci-actions queue')

      queued.push(job.id)
    }
  }

  logger.info({ repoId, event, sha, queued: queued.length, jobIds: queued }, '[webhook] ■ done')
  res.status(200).json({ ok: true, queued: queued.length })
})

export default webhook
