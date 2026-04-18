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
}
