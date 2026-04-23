const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; userId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; userId: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProjects: () =>
    request<{
      projects: {
        id: string
        projectName: string
        repoUrl: string
        status: string
        bucketPrefix: string | null
        deployedUrl: string | null
        createdAt: string
        updatedAt: string
      }[]
    }>('/deploy'),

  deploy: (repoUrl: string, projectName?: string, envVars?: { key: string; value: string }[]) =>
    request<{ projectId: string; status: string; projectName: string; bucketPrefix: string | null; deployedUrl: string | null }>(
      '/deploy',
      { method: 'POST', body: JSON.stringify({ repoUrl, projectName, envVars }) },
    ),

  getGithubStatus: () =>
    request<{ connected: boolean }>('/github/status'),

  getGithubRepos: () =>
    request<{
      repos: {
        id: number
        fullName: string
        private: boolean
        description: string | null
        cloneUrl: string
        updatedAt: string
      }[]
    }>('/github/repos'),

  connectGithub: () => {
    const t = token()
    if (t) window.location.href = `${BASE}/auth/github?token=${encodeURIComponent(t)}`
  },

  getMercioFunctions: () =>
    request<{
      functions: {
        id: string
        name: string
        status: string
        entry: string
        buildCommand: string | null
        errorMessage: string | null
        bundleKey: string | null
        createdAt: string
        updatedAt: string
      }[]
    }>('/api/mercio'),

  getMercioFunction: (id: string) =>
    request<{
      function: {
        id: string
        name: string
        status: string
        entry: string
        buildCommand: string | null
        errorMessage: string | null
        bundleKey: string | null
        createdAt: string
        updatedAt: string
      }
      invokeUrl: string
    }>(`/api/mercio/${id}`),

  uploadMercioFunction: (formData: FormData) => {
    const t = token()
    return fetch(`${BASE}/api/mercio/upload`, {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Upload failed')
      return data as { id: string; name: string; status: string; invokeUrl: string }
    })
  },

  deleteMercioFunction: (id: string) =>
    request<{ ok: boolean }>(`/api/mercio/${id}`, { method: 'DELETE' }),

  // ---- Mercob ----
  getMercobJobs: () =>
    request<{ jobs: MercobJob[] }>('/api/mercob/jobs'),

  getMercobJob: (id: string) =>
    request<{ job: MercobJob }>(`/api/mercob/jobs/${id}`),

  createMercobJob: (data: CreateMercobJobInput) =>
    request<{ job: MercobJob }>('/api/mercob/jobs', { method: 'POST', body: JSON.stringify(data) }),

  updateMercobJob: (id: string, data: Partial<CreateMercobJobInput> & { active?: boolean }) =>
    request<{ job: MercobJob }>(`/api/mercob/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteMercobJob: (id: string) =>
    request<{ ok: boolean }>(`/api/mercob/jobs/${id}`, { method: 'DELETE' }),

  triggerMercobJob: (id: string) =>
    request<{ runId: string }>(`/api/mercob/jobs/${id}/trigger`, { method: 'POST' }),

  getMercobRuns: (jobId: string, page = 1, limit = 20) =>
    request<{ runs: MercobRun[]; total: number; page: number; limit: number }>(
      `/api/mercob/jobs/${jobId}/runs?page=${page}&limit=${limit}`
    ),

  getMercobRun: (runId: string) =>
    request<{ run: MercobRun & { logs: MercobRunLog[]; job: { id: string; name: string; functionId: string } } }>(
      `/api/mercob/runs/${runId}`
    ),
}

export type ScheduleKind = 'DAILY' | 'WEEKLY' | 'INTERVAL' | 'ONCE' | 'CRON'
export type JobRunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT'

export interface MercobJob {
  id: string
  name: string
  functionId: string
  function?: { id: string; name: string; status: string }
  active: boolean
  recurring: boolean
  scheduleKind: ScheduleKind
  timeOfDay?: string | null
  daysOfWeek: number[]
  intervalSec?: number | null
  cronExpr?: string | null
  runAt?: string | null
  method: string
  path: string
  query?: Record<string, string> | null
  headers?: Record<string, string> | null
  body?: string | null
  maxRetries: number
  timeoutMs: number
  nextRunAt: string
  lastRunAt?: string | null
  createdAt: string
  updatedAt: string
  runs?: Pick<MercobRun, 'status' | 'finishedAt'>[]
}

export interface MercobRun {
  id: string
  jobId: string
  attempt: number
  status: JobRunStatus
  scheduledFor: string
  startedAt?: string | null
  finishedAt?: string | null
  durationMs?: number | null
  httpStatus?: number | null
  responseBody?: string | null
  errorMessage?: string | null
  createdAt: string
}

export interface MercobRunLog {
  id: string
  runId: string
  line: string
  stream: string
  createdAt: string
}

export interface CreateMercobJobInput {
  name: string
  functionId: string
  recurring?: boolean
  scheduleKind: ScheduleKind
  timeOfDay?: string
  daysOfWeek?: number[]
  intervalSec?: number
  cronExpr?: string
  runAt?: string
  method?: string
  path?: string
  query?: Record<string, string>
  headers?: Record<string, string>
  body?: string
  maxRetries?: number
  timeoutMs?: number
}
