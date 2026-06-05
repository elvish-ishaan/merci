import { logger } from './logger'
import { consumeStream, type LogFn } from './stream'

export async function cloneAtSha(
  repoFullName: string,
  sha: string,
  destDir: string,
  githubToken: string | null,
  onLog: LogFn,
): Promise<void> {
  const authUrl = githubToken
    ? `https://x-access-token:${githubToken}@github.com/${repoFullName}.git`
    : `https://github.com/${repoFullName}.git`

  onLog(`[merci] Cloning ${repoFullName}`, 'stdout')
  logger.info({ repoFullName, sha, destDir }, '[git] cloning repo')

  const cloneProc = Bun.spawn(
    ['git', 'clone', '--no-tags', authUrl, destDir],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  await Promise.all([
    consumeStream(cloneProc.stdout, 'stdout', onLog),
    consumeStream(cloneProc.stderr, 'stderr', onLog),
    cloneProc.exited,
  ])

  if (cloneProc.exitCode !== 0) {
    throw new Error(`git clone failed (exit ${cloneProc.exitCode})`)
  }

  onLog(`[merci] Checking out ${sha}`, 'stdout')
  logger.debug({ repoFullName, sha }, '[git] checking out SHA')

  const checkoutProc = Bun.spawn(
    ['git', '-C', destDir, 'checkout', sha],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  await Promise.all([
    consumeStream(checkoutProc.stdout, 'stdout', onLog),
    consumeStream(checkoutProc.stderr, 'stderr', onLog),
    checkoutProc.exited,
  ])

  if (checkoutProc.exitCode !== 0) {
    throw new Error(`git checkout failed (exit ${checkoutProc.exitCode})`)
  }

  logger.info({ repoFullName, sha }, '[git] ✓ checkout complete')
  onLog(`[merci] ✓ Source code ready`, 'stdout')
}

export async function cloneAction(
  owner: string,
  repo: string,
  ref: string,
  destDir: string,
): Promise<void> {
  const url = `https://github.com/${owner}/${repo}.git`
  logger.debug({ action: `${owner}/${repo}@${ref}`, destDir }, '[git] cloning action')

  const proc = Bun.spawn(
    ['git', 'clone', '--depth', '1', '--branch', ref, '--no-tags', url, destDir],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  const errText = await new Response(proc.stderr).text()
  await proc.exited

  if (proc.exitCode !== 0) {
    throw new Error(`git clone action failed (exit ${proc.exitCode}): ${errText.trim()}`)
  }

  logger.debug({ action: `${owner}/${repo}@${ref}` }, '[git] ✓ action cloned')
}
