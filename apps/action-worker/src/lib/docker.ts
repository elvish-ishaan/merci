import { logger } from './logger'
import { consumeStream, type LogFn } from './stream'

export function resolveImage(runsOn: string): string {
  const lower = runsOn.toLowerCase()
  if (lower.includes('ubuntu') || lower.includes('linux')) return 'node:20'
  if (lower.includes('node')) return 'node:20'
  return 'node:20'
}

export async function pullImage(image: string, onLog: LogFn): Promise<void> {
  onLog(`[merci] Pulling docker image: ${image}`, 'stdout')
  logger.info({ image }, '[docker] pulling image (if not cached)')

  const proc = Bun.spawn(['docker', 'pull', image], { stdout: 'pipe', stderr: 'pipe' })

  await Promise.all([
    consumeStream(proc.stdout, 'stdout', onLog),
    consumeStream(proc.stderr, 'stderr', onLog),
    proc.exited,
  ])

  logger.debug({ image, exit: proc.exitCode }, '[docker] pull done')
  onLog(`[merci] ✓ Image ready: ${image}`, 'stdout')
}

export async function createContainer(opts: {
  containerName: string
  image: string
  workspaceDir: string
  githubFilesDir: string
  env: Record<string, string>
  onLog: LogFn
}): Promise<void> {
  const { containerName, image, workspaceDir, githubFilesDir, env, onLog } = opts

  const envFlags = Object.entries(env).flatMap(([k, v]) => ['--env', `${k}=${v}`])

  onLog(`[merci] Starting container (${image})`, 'stdout')
  logger.info({ containerName, image }, '[docker] creating container')

  const proc = Bun.spawn(
    [
      'docker', 'run', '-d',
      '--name', containerName,
      '-v', `${workspaceDir}:/github/workspace`,
      '-v', `${githubFilesDir}:/github`,
      '-w', '/github/workspace',
      ...envFlags,
      image,
      'tail', '-f', '/dev/null',
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  await proc.exited

  if (proc.exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    onLog(`[merci] ✗ docker run failed: ${err.trim()}`, 'stderr')
    throw new Error(`docker run failed (exit ${proc.exitCode}): ${err}`)
  }

  logger.debug({ containerName }, '[docker] ✓ container started')
  onLog(`[merci] ✓ Container started`, 'stdout')
}

export async function execInContainer(opts: {
  containerName: string
  command: string
  shell?: string
  workingDir?: string
  env?: Record<string, string>
  onLog: LogFn
}): Promise<number> {
  const { containerName, command, shell = 'bash', workingDir, env = {}, onLog } = opts

  const envFlags = Object.entries(env).flatMap(([k, v]) => ['--env', `${k}=${v}`])
  const workdirFlags = workingDir ? ['--workdir', workingDir] : []

  logger.debug({ containerName, shell, commandPreview: command.slice(0, 80) }, '[docker] exec step')

  const proc = Bun.spawn(
    [
      'docker', 'exec',
      ...envFlags,
      ...workdirFlags,
      containerName,
      shell, '-e', '-c', command,
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  await Promise.all([
    consumeStream(proc.stdout, 'stdout', onLog),
    consumeStream(proc.stderr, 'stderr', onLog),
    proc.exited,
  ])

  logger.debug({ containerName, exit: proc.exitCode }, '[docker] exec done')
  return proc.exitCode ?? 1
}

export async function copyToContainer(
  containerName: string,
  srcPath: string,
  destPath: string,
): Promise<void> {
  // Ensure the destination parent directory exists inside the container
  const mkdirProc = Bun.spawn(
    ['docker', 'exec', containerName, 'mkdir', '-p', destPath],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  await mkdirProc.exited
  if (mkdirProc.exitCode !== 0) {
    const err = await new Response(mkdirProc.stderr).text()
    throw new Error(`docker exec mkdir -p failed: ${err}`)
  }

  const proc = Bun.spawn(
    ['docker', 'cp', `${srcPath}/.`, `${containerName}:${destPath}`],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  await proc.exited
  if (proc.exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`docker cp failed: ${err}`)
  }
}

export async function removeContainer(containerName: string): Promise<void> {
  const proc = Bun.spawn(
    ['docker', 'rm', '-f', containerName],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  await proc.exited
  logger.debug({ containerName }, '[docker] container removed')
}
