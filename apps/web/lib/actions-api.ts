const BASE = process.env['NEXT_PUBLIC_ACTIONS_URL'] ?? 'http://localhost:3003'

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...init,
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
  return data as T
}

export type CIStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'SKIPPED'

export interface ActionRepo {
  id: string
  repoFullName: string
  createdAt: string
  _count: { runs: number; secrets?: number }
}

export interface ActionRun {
  id: string
  workflowFile: string
  event: string
  ref: string
  sha: string
  status: CIStatus
  conclusion: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  repo: { id: string; repoFullName: string }
  _count: { jobs: number }
}

export interface ActionJob {
  id: string
  runId: string
  jobKey: string
  name: string
  status: CIStatus
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  steps: ActionStep[]
  _count?: { steps: number }
}

export interface ActionStep {
  id: string
  name: string
  number: number
  status: CIStatus
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
}

export interface ActionLog {
  id: string
  line: string
  stream: string
  createdAt: string
}

export interface ActionSecret {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export const actionsApi = {
  // Repos
  getRepos: () =>
    request<{ repos: ActionRepo[] }>('/api/repos'),

  registerRepo: (repoFullName: string) =>
    request<{ repo: ActionRepo }>('/api/repos', {
      method: 'POST',
      body: JSON.stringify({ repoFullName }),
    }),

  getRepo: (repoId: string) =>
    request<{ repo: ActionRepo }>(`/api/repos/${repoId}`),

  deleteRepo: (repoId: string) =>
    request<{ ok: boolean }>(`/api/repos/${repoId}`, { method: 'DELETE' }),

  syncWebhook: (repoId: string) =>
    request<{ ok: boolean; webhookUrl: string }>(`/api/repos/${repoId}/webhook/sync`, { method: 'POST' }),

  // Runs
  getRuns: (repoId: string, page = 1) =>
    request<{ runs: ActionRun[]; total: number; page: number; limit: number }>(
      `/api/runs?repoId=${repoId}&page=${page}`
    ),

  getRun: (runId: string) =>
    request<{ run: ActionRun & { jobs: ActionJob[] } }>(`/api/runs/${runId}`),

  getJob: (runId: string, jobId: string) =>
    request<{ job: ActionJob }>(`/api/runs/${runId}/jobs/${jobId}`),

  getStepLogs: (runId: string, jobId: string, stepId: string) =>
    request<{ logs: ActionLog[] }>(`/api/runs/${runId}/jobs/${jobId}/steps/${stepId}/logs`),

  rerunRun: (runId: string) =>
    request<{ run: ActionRun }>(`/api/runs/${runId}/rerun`, { method: 'POST' }),

  // Secrets
  getSecrets: (repoId: string) =>
    request<{ secrets: ActionSecret[] }>(`/api/repos/${repoId}/secrets`),

  upsertSecret: (repoId: string, name: string, value: string) =>
    request<{ secret: ActionSecret }>(`/api/repos/${repoId}/secrets/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  deleteSecret: (repoId: string, name: string) =>
    request<{ ok: boolean }>(`/api/repos/${repoId}/secrets/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
}
