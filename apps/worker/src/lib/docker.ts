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

export async function buildInDocker(
  projectDir: string,
  envVars?: { key: string; value: string }[],
): Promise<void> {
  const envFlags: string[] = []
  for (const { key, value } of envVars ?? []) {
    envFlags.push('--env', `${key}=${value}`)
  }

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
    { stdout: 'inherit', stderr: 'inherit' },
  )

  const code = await proc.exited
  if (code !== 0) {
    throw new Error(`Docker build exited with code ${code}`)
  }
}
