import { existsSync } from 'fs'
import { join } from 'path'

const BUILD_DIRS = ['dist', 'build', 'out', '.next']

export function detectBuildDir(projectDir: string): string {
  for (const dir of BUILD_DIRS) {
    const candidate = join(projectDir, dir)
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`No build output found in ${projectDir}. Expected one of: ${BUILD_DIRS.join(', ')}`)
}

async function consumeStream(
  readable: ReadableStream<Uint8Array>,
  streamName: 'stdout' | 'stderr',
  onLog: (line: string, stream: 'stdout' | 'stderr') => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''
  const reader = readable.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (buffer.length > 0) onLog(buffer, streamName)
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.length > 0) onLog(line, streamName)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function buildInDocker(
  projectDir: string,
  envVars?: { key: string; value: string }[],
  onLog?: (line: string, stream: 'stdout' | 'stderr') => void,
): Promise<void> {
  const envFlags: string[] = []
  for (const { key, value } of envVars ?? []) {
    envFlags.push('--env', `${key}=${value}`)
  }

  const noop = () => {}
  const logFn = onLog ?? noop

  const proc = Bun.spawn(
    [
      'docker',
      'run',
      '--rm',
      '-v',
      `${projectDir}:/app`,
      '-w',
      '/app',
      ...envFlags,
      'node:20-alpine',
      'sh',
      '-c',
      'npm install && npm run build',
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )

  await Promise.all([
    consumeStream(proc.stdout, 'stdout', logFn),
    consumeStream(proc.stderr, 'stderr', logFn),
    proc.exited,
  ])

  if (proc.exitCode !== 0) {
    throw new Error(`Docker build exited with code ${proc.exitCode}`)
  }
}
