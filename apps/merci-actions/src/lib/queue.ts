import { Queue } from 'bullmq'
import { redisConnection } from './redis'
import type { WorkflowStep } from './yaml-parser'

export interface ActionJobPayload {
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

export const actionQueue = new Queue<ActionJobPayload>('merci-actions', {
  connection: redisConnection,
})
