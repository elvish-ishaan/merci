import type { NormalizedTriggers, TriggerFilter } from './actions-yaml-parser'

function matchPattern(pattern: string, value: string): boolean {
  const regex = new RegExp(
    '^' +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.+')
        .replace(/\*/g, '[^/]+')
        .replace(/\?/g, '[^/]') +
      '$',
  )
  return regex.test(value)
}

function matchesList(patterns: string[] | undefined, value: string): boolean {
  if (!patterns || patterns.length === 0) return true
  return patterns.some((p) => matchPattern(p, value))
}

export interface EventContext {
  event: string
  branch?: string   // branch name without refs/heads/
  tag?: string      // tag name without refs/tags/
  prAction?: string // opened, synchronize, closed, reopened
  paths?: string[]
}

export function buildContextFromPush(payload: PushPayload): EventContext {
  const ref = payload.ref
  const branch = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : undefined
  const tag = ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : undefined
  return { event: 'push', branch, tag }
}

export function buildContextFromPullRequest(payload: PullRequestPayload): EventContext {
  return {
    event: 'pull_request',
    branch: payload.pull_request.head.ref,
    prAction: payload.action,
  }
}

export function matchesTrigger(triggers: NormalizedTriggers, ctx: EventContext): boolean {
  if (!(ctx.event in triggers)) return false

  const filter: TriggerFilter = triggers[ctx.event] ?? null
  if (filter === null) return true

  if (ctx.event === 'push') {
    if (ctx.tag) {
      if (filter['tags-ignore'] && matchesList(filter['tags-ignore'], ctx.tag)) return false
      if (filter.tags && !matchesList(filter.tags, ctx.tag)) return false
    } else if (ctx.branch) {
      if (filter['branches-ignore'] && matchesList(filter['branches-ignore'], ctx.branch)) return false
      if (filter.branches && !matchesList(filter.branches, ctx.branch)) return false
    }
    return true
  }

  if (ctx.event === 'pull_request') {
    if (ctx.branch) {
      if (filter['branches-ignore'] && matchesList(filter['branches-ignore'], ctx.branch)) return false
      if (filter.branches && !matchesList(filter.branches, ctx.branch)) return false
    }
    if (ctx.prAction && filter.types && !filter.types.includes(ctx.prAction)) return false
    return true
  }

  return true
}

// Minimal payload types — only the fields we consume
export interface PushPayload {
  ref: string
  after: string
  repository: { full_name: string }
  pusher?: { name: string }
}

export interface PullRequestPayload {
  action: string
  pull_request: { head: { sha: string; ref: string }; base: { ref: string } }
  repository: { full_name: string }
  sender?: { login: string }
}
