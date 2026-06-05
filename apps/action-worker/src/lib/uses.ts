import path from 'path'
import fs from 'fs-extra'
import yaml from 'js-yaml'
import { cloneAction } from './git'
import { execInContainer, copyToContainer } from './docker'
import { logger } from './logger'

type LogFn = (line: string, stream: 'stdout' | 'stderr') => void

interface ActionInputDef {
  description?: string
  default?: string
  required?: boolean
}

interface ActionMeta {
  name?: string
  using: string        // 'node20' | 'node16' | 'docker' | 'composite'
  main?: string        // for node actions
  image?: string       // for docker actions
  runs?: { using: string; main?: string; image?: string; steps?: unknown[] }
  inputs?: Record<string, ActionInputDef>
}

// Global action cache — survives across jobs in the same process
const ACTION_CACHE_DIR = path.join(process.env['RUNNER_TEMP'] ?? '/tmp', 'merci-action-cache')

function parseUsesRef(uses: string): { owner: string; repo: string; ref: string } | null {
  // e.g. "actions/checkout@v4" or "actions/setup-node@v4"
  const match = uses.match(/^([^/]+)\/([^@]+)@(.+)$/)
  if (!match) return null
  return { owner: match[1] ?? '', repo: match[2] ?? '', ref: match[3] ?? '' }
}

async function getActionDir(owner: string, repo: string, ref: string): Promise<string> {
  const cacheKey = `${owner}/${repo}@${ref}`.replace(/[^a-zA-Z0-9@._-]/g, '_')
  const actionDir = path.join(ACTION_CACHE_DIR, cacheKey)

  if (await fs.pathExists(actionDir)) {
    // Validate the cache — a partial clone leaves the directory but no action.yml
    const valid =
      (await fs.pathExists(path.join(actionDir, 'action.yml'))) ||
      (await fs.pathExists(path.join(actionDir, 'action.yaml')))
    if (valid) {
      logger.debug({ action: `${owner}/${repo}@${ref}` }, '[uses] using cached action')
      return actionDir
    }
    logger.warn({ action: `${owner}/${repo}@${ref}`, actionDir }, '[uses] cache dir exists but action.yml missing — removing and re-cloning')
    await fs.remove(actionDir).catch(() => {})
  }

  // Ensure the cache root exists but NOT actionDir itself — git clone creates it
  await fs.ensureDir(ACTION_CACHE_DIR)
  try {
    await cloneAction(owner, repo, ref, actionDir)
  } catch (err) {
    await fs.remove(actionDir).catch(() => {})
    throw err
  }
  return actionDir
}

export async function executeUsesStep(opts: {
  uses: string
  with?: Record<string, unknown>
  env?: Record<string, string>
  containerName: string
  onLog: LogFn
}): Promise<number> {
  const { uses, with: inputs = {}, env = {}, containerName, onLog } = opts

  onLog(`[merci] resolving action: ${uses}`, 'stdout')

  // docker:// images — run directly
  if (uses.startsWith('docker://')) {
    const image = uses.slice('docker://'.length)
    onLog(`[merci] docker action — image: ${image}`, 'stdout')
    logger.info({ uses, image }, '[uses] docker:// action — not supported in Phase 1')
    onLog(`[merci] docker:// actions are not yet supported`, 'stderr')
    return 1
  }

  // Local action ./path
  if (uses.startsWith('./')) {
    onLog(`[merci] local action: ${uses}`, 'stdout')
    const actionYmlPath = `/github/workspace/${uses}/action.yml`
    const actionMeta = await readActionYmlFromContainer(containerName, actionYmlPath, onLog)
    if (!actionMeta) return 1
    return runAction(actionMeta, inputs, env, containerName, `/github/workspace/${uses}`, onLog)
  }

  // Remote action owner/repo@ref
  const parsed = parseUsesRef(uses)
  if (!parsed) {
    onLog(`[merci] ✗ invalid uses format: ${uses}`, 'stderr')
    return 1
  }

  const { owner, repo, ref } = parsed
  let actionDir: string
  try {
    actionDir = await getActionDir(owner, repo, ref)
  } catch (err: any) {
    onLog(`[merci] ✗ failed to download action ${uses}: ${err?.message}`, 'stderr')
    return 1
  }

  // Parse action.yml
  const actionYmlPath = path.join(actionDir, 'action.yml')
  const actionYmlAltPath = path.join(actionDir, 'action.yaml')
  let actionMeta: ActionMeta | null = null
  for (const p of [actionYmlPath, actionYmlAltPath]) {
    if (await fs.pathExists(p)) {
      const content = await fs.readFile(p, 'utf-8')
      actionMeta = yaml.load(content) as ActionMeta
      break
    }
  }

  if (!actionMeta) {
    onLog(`[merci] ✗ no action.yml found in ${uses}`, 'stderr')
    return 1
  }

  const using = (actionMeta.runs?.using ?? actionMeta.using ?? '').toLowerCase()
  onLog(`[merci] action type: ${using}`, 'stdout')

  // Copy action to container
  const containerActionPath = `/github/actions/${owner}/${repo}`
  logger.debug({ action: uses, containerActionPath }, '[uses] copying action into container')
  try {
    await copyToContainer(containerName, actionDir, containerActionPath)
  } catch (err: any) {
    onLog(`[merci] ✗ failed to copy action into container: ${err?.message}`, 'stderr')
    return 1
  }

  return runAction(actionMeta, inputs, env, containerName, containerActionPath, onLog)
}

async function readActionYmlFromContainer(
  containerName: string,
  ymlPath: string,
  onLog: LogFn,
): Promise<ActionMeta | null> {
  let content = ''
  const exit = await execInContainer({
    containerName,
    command: `cat ${ymlPath}`,
    onLog: (line) => { content += line + '\n' },
  })
  if (exit !== 0) {
    onLog(`[merci] ✗ action.yml not found at ${ymlPath}`, 'stderr')
    return null
  }
  return yaml.load(content) as ActionMeta
}

async function runAction(
  meta: ActionMeta,
  inputs: Record<string, unknown>,
  env: Record<string, string>,
  containerName: string,
  actionPath: string,
  onLog: LogFn,
): Promise<number> {
  const using = (meta.runs?.using ?? meta.using ?? '').toLowerCase()
  const mainScript = meta.runs?.main ?? meta.main

  // Build INPUT_* env vars from with: block
  const inputEnv: Record<string, string> = {}
  for (const [k, v] of Object.entries(inputs)) {
    inputEnv[`INPUT_${k.toUpperCase().replace(/ /g, '_')}`] = String(v)
  }

  // Apply defaults from action.yml for any inputs not explicitly provided in with:
  for (const [k, def] of Object.entries(meta.inputs ?? {})) {
    const envKey = `INPUT_${k.toUpperCase().replace(/ /g, '_')}`
    if (envKey in inputEnv || def.default === undefined || def.default === null) continue
    // Resolve ${{ github.X }} → GITHUB_X env var (covers token, repository, sha, ref, etc.)
    inputEnv[envKey] = String(def.default).replace(
      /\$\{\{\s*github\.(\w+)\s*\}\}/gi,
      (_, prop: string) => env[`GITHUB_${prop.toUpperCase()}`] ?? '',
    )
  }

  if (using === 'node20' || using === 'node16') {
    if (!mainScript) {
      onLog(`[merci] ✗ action.yml missing runs.main`, 'stderr')
      return 1
    }
    const scriptPath = `${actionPath}/${mainScript}`
    onLog(`[merci] running node action: node ${scriptPath}`, 'stdout')

    return execInContainer({
      containerName,
      command: `node ${scriptPath}`,
      env: { ...env, ...inputEnv },
      onLog,
    })
  }

  if (using === 'docker') {
    onLog(`[merci] docker-type actions are not yet supported in this runner`, 'stderr')
    return 1
  }

  if (using === 'composite') {
    onLog(`[merci] composite actions are not yet supported in this runner`, 'stderr')
    return 1
  }

  onLog(`[merci] ✗ unknown action type: ${using}`, 'stderr')
  return 1
}
