import { Worker, type Job } from 'bullmq'
import path from 'path'
import os from 'os'
import fs from 'fs-extra'
import prisma from '@repo/db'
import { decryptValue } from '@repo/crypto'
import { redisConnection } from './lib/redis'
import { logger } from './lib/logger'
import { postLog, patchStep, patchJob, patchRun } from './lib/api'
import { cloneAtSha } from './lib/git'
import { pullImage, createContainer, execInContainer, removeContainer, resolveImage } from './lib/docker'
import { buildBaseEnv, readExportedEnv } from './lib/runner-env'
import { interpolate, evalCondition } from './lib/expression'
import { executeUsesStep } from './lib/uses'

// ── Payload type (mirrors merci-actions/src/lib/queue.ts) ─────────────────────
interface WorkflowStep {
  id?: string
  name?: string
  if?: string
  uses?: string
  run?: string
  shell?: string
  env?: Record<string, string>
  with?: Record<string, unknown>
  'continue-on-error'?: boolean
  'working-directory'?: string
}

interface ActionJobPayload {
  runId: string
  jobId: string
  repoFullName: string
  sha: string
  ref: string
  event: string
  runsOn: string
  steps: WorkflowStep[]
  env: Record<string, string>
  secrets: Array<{ name: string; encryptedValue: string }>
  encryptedGithubToken: string | null
  actor: string
}

// ── Job processor ──────────────────────────────────────────────────────────────

async function processJob(job: Job<ActionJobPayload>): Promise<void> {
  const { runId, jobId, repoFullName, sha, ref, event, runsOn, steps, env, secrets, encryptedGithubToken, actor } = job.data

  logger.info({ runId, jobId, repoFullName, sha, runsOn, stepCount: steps.length }, '[worker] ▶ job started')

  const tempDir = path.join(os.tmpdir(), `merci-action-${jobId}`)
  const workspaceDir = path.join(tempDir, 'workspace')
  const githubFilesDir = path.join(tempDir, 'github')
  const containerName = `merci-action-${jobId}`

  // ── 1. Prepare temp dirs ─────────────────────────────────────────────────────
  await fs.ensureDir(workspaceDir)
  await fs.ensureDir(githubFilesDir)
  await fs.ensureDir(path.join(githubFilesDir, 'runner_temp'))
  await fs.writeFile(path.join(githubFilesDir, 'env'), '')
  await fs.writeFile(path.join(githubFilesDir, 'path'), '')
  await fs.writeFile(path.join(githubFilesDir, 'output'), '')
  await fs.writeFile(path.join(githubFilesDir, 'step_summary'), '')
  logger.debug({ tempDir }, '[worker] temp dirs ready')

  // ── 2. Decrypt secrets ────────────────────────────────────────────────────────
  let githubToken: string | null = null
  if (encryptedGithubToken) {
    try {
      githubToken = decryptValue(encryptedGithubToken)
      logger.debug({ runId }, '[worker] github token decrypted')
    } catch (err) {
      logger.error({ err, runId }, '[worker] failed to decrypt github token')
    }
  }

  const decryptedSecrets: Record<string, string> = {}
  for (const { name, encryptedValue } of secrets) {
    try {
      decryptedSecrets[name] = decryptValue(encryptedValue)
    } catch {
      logger.warn({ name }, '[worker] failed to decrypt secret, skipping')
    }
  }

  // ── 3. Mark run + job as RUNNING ──────────────────────────────────────────────
  await patchRun(runId, { status: 'RUNNING', startedAt: new Date().toISOString() })
  await patchJob(jobId, { status: 'RUNNING', startedAt: new Date().toISOString() })

  // ── 4. Fetch DB steps ─────────────────────────────────────────────────────────
  const dbSteps = await prisma.actionStep.findMany({
    where: { jobId },
    orderBy: { number: 'asc' },
    select: { id: true, number: true },
  })

  // Setup step (number: -1) gets all pre-step logs; user steps start at number: 0
  const setupDbStep = dbSteps.find(s => s.number === -1)
  const userDbSteps = dbSteps.filter(s => s.number >= 0)

  const setupLog = (line: string, stream: 'stdout' | 'stderr') => {
    if (stream === 'stderr') {
      logger.warn({ jobId, step: 'setup' }, `[setup] ${line}`)
    } else {
      logger.debug({ jobId, step: 'setup' }, `[setup] ${line}`)
    }
    if (setupDbStep) postLog(setupDbStep.id, line, stream)
  }

  logger.debug({ jobId, dbStepCount: dbSteps.length, hasSetupStep: !!setupDbStep }, '[worker] DB steps loaded')

  let jobConclusion = 'success'

  // ── 5. Setup phase (clone + container) ───────────────────────────────────────
  if (setupDbStep) {
    await patchStep(setupDbStep.id, { status: 'RUNNING', startedAt: new Date().toISOString() })
  }

  try {
    logger.info({ repoFullName, sha, workspaceDir }, '[worker] cloning repo')
    await cloneAtSha(repoFullName, sha, workspaceDir, githubToken, setupLog)
    logger.info({ repoFullName, sha }, '[worker] ✓ repo cloned')

    const image = resolveImage(runsOn)
    await pullImage(image, setupLog)

    const baseEnv = buildBaseEnv({ repoFullName, sha, ref, event, actor, githubToken })
    const jobEnv = { ...baseEnv, ...env, ...decryptedSecrets }

    await createContainer({ containerName, image, workspaceDir, githubFilesDir, env: jobEnv, onLog: setupLog })
    logger.info({ containerName }, '[worker] ✓ container running')

    // Allow git operations on the mounted workspace regardless of file ownership.
    // Git 2.35+ rejects repos owned by a different user (host uid vs container root),
    // which breaks actions/checkout and any run: step using git.
    setupLog('[merci] Configuring git safe.directory', 'stdout')
    await execInContainer({
      containerName,
      command: 'git config --global --add safe.directory "*"',
      onLog: setupLog,
    })
    setupLog('[merci] ✓ Setup complete', 'stdout')

    if (setupDbStep) {
      await patchStep(setupDbStep.id, { status: 'SUCCEEDED', conclusion: 'success', completedAt: new Date().toISOString() })
    }
  } catch (err: any) {
    logger.error({ err, runId, jobId }, '[worker] ✗ setup failed')
    setupLog(`[merci] ✗ Setup failed: ${err?.message ?? String(err)}`, 'stderr')
    if (setupDbStep) {
      await patchStep(setupDbStep.id, { status: 'FAILED', conclusion: 'failure', completedAt: new Date().toISOString() })
    }
    jobConclusion = 'failure'

    // Skip to cleanup
    const finalStatus = 'FAILED'
    await patchJob(jobId, { status: finalStatus, conclusion: jobConclusion, completedAt: new Date().toISOString() })
    await patchRun(runId, { status: finalStatus, conclusion: jobConclusion, completedAt: new Date().toISOString() })
    logger.info({ runId, jobId, conclusion: jobConclusion }, '[worker] ■ job finished (setup failed)')

    await removeContainer(containerName).catch(() => {})
    await fs.remove(tempDir).catch(() => {})
    logger.debug({ tempDir }, '[worker] temp dir removed')
    return
  }

  // ── 6. Execute user steps ─────────────────────────────────────────────────────
  try {
    let previousStepFailed = false
    let stepEnv: Record<string, string> = {}

    const baseEnv = buildBaseEnv({ repoFullName, sha, ref, event, actor, githubToken })
    const jobEnv = { ...baseEnv, ...env, ...decryptedSecrets }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!
      const dbStep = userDbSteps[i]
      if (!dbStep) {
        logger.warn({ i, jobId }, '[worker] no DB step for index, skipping')
        continue
      }
      const stepId = dbStep.id
      const stepName = step.name ?? step.uses ?? step.run?.split('\n')[0]?.slice(0, 60) ?? `Step ${i + 1}`

      logger.info({ stepId, stepName, i }, '[worker] ── step start')

      const exprCtx = {
        github: { sha, ref, repository: repoFullName, event_name: event, actor, ref_name: ref },
        secrets: decryptedSecrets,
        env: { ...jobEnv, ...stepEnv },
        inputs: {},
      }

      // ── if: condition ────────────────────────────────────────────────────────
      if (step.if !== undefined) {
        const condition = interpolate(step.if, exprCtx)
        const shouldRun = evalCondition(condition, previousStepFailed)
        if (!shouldRun) {
          logger.info({ stepId, stepName, condition }, '[worker] step skipped (if: false)')
          await patchStep(stepId, { status: 'SKIPPED', conclusion: 'skipped',
            startedAt: new Date().toISOString(), completedAt: new Date().toISOString() })
          continue
        }
      } else if (previousStepFailed) {
        logger.info({ stepId, stepName }, '[worker] step skipped (previous step failed)')
        await patchStep(stepId, { status: 'SKIPPED', conclusion: 'skipped',
          startedAt: new Date().toISOString(), completedAt: new Date().toISOString() })
        continue
      }

      await patchStep(stepId, { status: 'RUNNING', startedAt: new Date().toISOString() })

      const rawStepEnv: Record<string, string> = {}
      for (const [k, v] of Object.entries(step.env ?? {})) {
        rawStepEnv[k] = interpolate(v, exprCtx)
      }
      const stepExecEnv = { ...stepEnv, ...rawStepEnv }

      const onLog = (line: string, stream: 'stdout' | 'stderr') => {
        if (stream === 'stderr') {
          logger.warn({ jobId, stepId, stepName }, `[step] ${line}`)
        } else {
          logger.debug({ jobId, stepId, stepName }, `[step] ${line}`)
        }
        postLog(stepId, line, stream)
      }

      let exitCode = 0

      if (step.uses) {
        const interpolatedUses = interpolate(step.uses, exprCtx)
        const interpolatedWith: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(step.with ?? {})) {
          interpolatedWith[k] = typeof v === 'string' ? interpolate(v, exprCtx) : v
        }

        logger.info({ stepId, uses: interpolatedUses }, '[worker] running uses: action')
        exitCode = await executeUsesStep({
          uses: interpolatedUses,
          with: interpolatedWith,
          env: { ...jobEnv, ...stepExecEnv },
          containerName,
          onLog,
        })
      } else if (step.run) {
        const command = interpolate(step.run, exprCtx)
        const shell = step.shell ?? 'bash'
        const workingDir = step['working-directory']
          ? interpolate(step['working-directory'], exprCtx)
          : undefined

        logger.info({ stepId, shell, commandPreview: command.slice(0, 80) }, '[worker] running shell step')
        exitCode = await execInContainer({ containerName, command, shell, workingDir, env: stepExecEnv, onLog })
      } else {
        logger.warn({ stepId, stepName }, '[worker] step has neither run: nor uses:, skipping')
      }

      const newEnvVars = await readExportedEnv(path.join(githubFilesDir, 'env'))
      if (Object.keys(newEnvVars).length > 0) {
        stepEnv = { ...stepEnv, ...newEnvVars }
      }

      const continueOnError = step['continue-on-error'] ?? false
      const stepFailed = exitCode !== 0

      if (stepFailed) {
        logger.warn({ stepId, stepName, exitCode }, '[worker] step failed')
        await patchStep(stepId, { status: 'FAILED', conclusion: 'failure', completedAt: new Date().toISOString() })
        postLog(stepId, `[merci] step exited with code ${exitCode}`, 'stderr')
        if (!continueOnError) {
          previousStepFailed = true
          jobConclusion = 'failure'
        }
      } else {
        logger.info({ stepId, stepName }, '[worker] ✓ step succeeded')
        await patchStep(stepId, { status: 'SUCCEEDED', conclusion: 'success', completedAt: new Date().toISOString() })
      }
    }
  } catch (err: any) {
    logger.error({ err, runId, jobId }, '[worker] ✗ job threw unexpectedly')
    jobConclusion = 'failure'
  } finally {
    // ── 7. Cleanup ────────────────────────────────────────────────────────────
    logger.info({ containerName }, '[worker] removing container')
    await removeContainer(containerName).catch(() => {})
    await fs.remove(tempDir).catch(() => {})
    logger.debug({ tempDir }, '[worker] temp dir removed')
  }

  // ── 8. Final status ────────────────────────────────────────────────────────
  const finalStatus = jobConclusion === 'success' ? 'SUCCEEDED' : 'FAILED'
  await patchJob(jobId, { status: finalStatus, conclusion: jobConclusion, completedAt: new Date().toISOString() })
  await patchRun(runId, { status: finalStatus, conclusion: jobConclusion, completedAt: new Date().toISOString() })

  logger.info({ runId, jobId, conclusion: jobConclusion }, '[worker] ■ job finished')
}

// ── Worker factory ─────────────────────────────────────────────────────────────

export function createActionWorker(): Worker<ActionJobPayload> {
  const concurrency = Number(process.env['WORKER_CONCURRENCY'] ?? 2)

  const worker = new Worker<ActionJobPayload>('merci-actions', processJob, {
    connection: redisConnection,
    concurrency,
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, runId: job?.data?.runId, err: err.message }, '[worker] BullMQ job failed')
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, runId: job.data.runId }, '[worker] BullMQ job completed')
  })

  worker.on('error', (err) => {
    logger.error({ err }, '[worker] worker error')
  })

  logger.info({ concurrency, queue: 'merci-actions' }, '[worker] action worker started')
  return worker
}
