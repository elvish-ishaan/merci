import fs from 'fs-extra'

export interface RunnerContext {
  repoFullName: string
  sha: string
  ref: string
  event: string
  actor: string
  githubToken: string | null
}

export function buildBaseEnv(ctx: RunnerContext): Record<string, string> {
  return {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_WORKSPACE: '/github/workspace',
    GITHUB_ENV: '/github/env',
    GITHUB_PATH: '/github/path',
    GITHUB_OUTPUT: '/github/output',
    GITHUB_STEP_SUMMARY: '/github/step_summary',
    RUNNER_TEMP: '/github/runner_temp',
    RUNNER_TOOL_CACHE: '/opt/hostedtoolcache',
    RUNNER_OS: 'Linux',
    RUNNER_ARCH: 'X64',
    GITHUB_REPOSITORY: ctx.repoFullName,
    GITHUB_REPOSITORY_OWNER: ctx.repoFullName.split('/')[0] ?? '',
    GITHUB_SHA: ctx.sha,
    GITHUB_REF: ctx.ref,
    GITHUB_REF_NAME: refName(ctx.ref),
    GITHUB_REF_TYPE: ctx.ref.startsWith('refs/tags/') ? 'tag' : 'branch',
    GITHUB_EVENT_NAME: ctx.event,
    GITHUB_ACTOR: ctx.actor,
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_API_URL: 'https://api.github.com',
    ...(ctx.githubToken ? { GITHUB_TOKEN: ctx.githubToken } : {}),
  }
}

function refName(ref: string): string {
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length)
  if (ref.startsWith('refs/tags/')) return ref.slice('refs/tags/'.length)
  return ref
}

// After each step, read the GITHUB_ENV file the action may have written to
// and return newly exported key=value pairs.
export async function readExportedEnv(githubEnvPath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(githubEnvPath, 'utf-8')
    const result: Record<string, string> = {}
    // GitHub's multiline syntax: NAME<<EOF\nvalue\nEOF — handle simple KEY=VALUE for now
    for (const line of content.split('\n')) {
      const eq = line.indexOf('=')
      if (eq > 0) {
        const key = line.slice(0, eq).trim()
        const value = line.slice(eq + 1).trim()
        if (key) result[key] = value
      }
    }
    return result
  } catch {
    return {}
  }
}
