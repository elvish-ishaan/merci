import yaml from 'js-yaml'

export interface WorkflowStep {
  id?: string
  name?: string
  if?: string
  uses?: string
  run?: string
  shell?: string
  env?: Record<string, string>
  with?: Record<string, unknown>
  'continue-on-error'?: boolean
  'timeout-minutes'?: number
}

export interface WorkflowJob {
  name?: string
  'runs-on': string | string[]
  needs?: string | string[]
  if?: string
  env?: Record<string, string>
  steps: WorkflowStep[]
  strategy?: {
    matrix?: Record<string, unknown[]>
    'fail-fast'?: boolean
    'max-parallel'?: number
  }
  'timeout-minutes'?: number
  'continue-on-error'?: boolean
}

export type TriggerFilter = {
  branches?: string[]
  'branches-ignore'?: string[]
  tags?: string[]
  'tags-ignore'?: string[]
  paths?: string[]
  'paths-ignore'?: string[]
  types?: string[]
} | null

export type NormalizedTriggers = Record<string, TriggerFilter>

export interface ParsedWorkflow {
  name?: string
  triggers: NormalizedTriggers
  env: Record<string, string>
  jobs: Record<string, WorkflowJob>
}

function normalizeTriggers(raw: unknown): NormalizedTriggers {
  if (typeof raw === 'string') return { [raw]: null }
  if (Array.isArray(raw)) return Object.fromEntries((raw as string[]).map((e) => [e, null]))
  if (typeof raw === 'object' && raw !== null) return raw as NormalizedTriggers
  return {}
}

export function parseWorkflow(content: string): ParsedWorkflow {
  const doc = yaml.load(content) as Record<string, unknown>
  return {
    name: typeof doc['name'] === 'string' ? doc['name'] : undefined,
    triggers: normalizeTriggers(doc['on']),
    env: (doc['env'] as Record<string, string>) ?? {},
    jobs: (doc['jobs'] as Record<string, WorkflowJob>) ?? {},
  }
}
