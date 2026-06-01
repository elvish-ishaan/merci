'use client'

import { useState, useEffect, useCallback, type FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type GithubRepo = {
  id: number
  fullName: string
  private: boolean
  description: string | null
  cloneUrl: string
  updatedAt: string
}

type Project = {
  id: string
  projectName: string
  repoUrl: string
  status: string
  bucketPrefix: string | null
  deployedUrl: string | null
  createdAt: string
  updatedAt: string
}

type EnvRow = { key: string; value: string }

const STATUS_VARIANT: Record<string, string> = {
  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  UPLOADING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CLONING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const INITIAL_ENV_ROWS: EnvRow[] = [{ key: '', value: '' }]

function GithubRepoList({
  selectedUrl,
  onSelect,
}: {
  selectedUrl: string
  onSelect: (repoUrl: string, defaultName: string) => void
}) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getGithubStatus()
      .then(({ connected }) => {
        setConnected(connected)
        if (connected) {
          setLoadingRepos(true)
          api.getGithubRepos()
            .then(({ repos }) => setRepos(repos))
            .catch(() => {})
            .finally(() => setLoadingRepos(false))
        }
      })
      .catch(() => setConnected(false))
  }, [])

  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  if (connected === null) {
    return <p className="text-muted-foreground text-sm py-6 text-center">Checking GitHub connection…</p>
  }

  if (!connected) {
    return (
      <div className="py-8 flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Connect your GitHub account to browse and import your repositories.
        </p>
        <Button onClick={() => api.connectGithub()} className="gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.165c-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.51 11.51 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.61-2.807 5.628-5.479 5.923.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Connect GitHub
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg border border-border overflow-hidden">
      <div className="px-3 border-b border-border bg-muted/20">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories…"
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {loadingRepos ? (
        <p className="text-muted-foreground text-sm text-center py-8">Loading repositories…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No repositories found.</p>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
          {filtered.map((repo) => {
            const url = `https://github.com/${repo.fullName}`
            const isSelected = selectedUrl === url
            return (
              <li key={repo.id} className="border-b border-border/50 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(url, repo.fullName.split('/')[1] ?? repo.fullName)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isSelected ? 'bg-muted/70' : 'hover:bg-muted/40'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground/80">
                    {repo.fullName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DeployDialog({
  open,
  onClose,
  onDeployed,
}: {
  open: boolean
  onClose: () => void
  onDeployed: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [repoUrl, setRepoUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [envRows, setEnvRows] = useState<EnvRow[]>(INITIAL_ENV_ROWS)
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [deployResult, setDeployResult] = useState<{ projectId: string; status: string } | null>(null)

  function reset() {
    setStep(1)
    setRepoUrl('')
    setProjectName('')
    setEnvRows(INITIAL_ENV_ROWS)
    setDeploying(false)
    setDeployError('')
    setDeployResult(null)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset()
      onClose()
    }
  }

  function handleRepoSelect(url: string, defaultName: string) {
    setRepoUrl(url)
    if (!projectName) setProjectName(defaultName)
  }

  function handleNext(e: FormEvent) {
    e.preventDefault()
    if (!repoUrl) return
    setDeployError('')
    setStep(2)
  }

  function updateRow(index: number, field: 'key' | 'value', val: string) {
    setEnvRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: val } : r)))
  }

  function addRow() {
    if (envRows.length < 50) setEnvRows((rows) => [...rows, { key: '', value: '' }])
  }

  function removeRow(index: number) {
    setEnvRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  async function handleDeploy(e: FormEvent) {
    e.preventDefault()
    setDeployError('')
    setDeploying(true)
    try {
      const filteredEnvVars = envRows.filter((r) => r.key.trim().length > 0)
      const result = await api.deploy(repoUrl, projectName || undefined, filteredEnvVars)
      setDeployResult(result)
      onDeployed()
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>New deployment</DialogTitle>
            {!deployResult && (
              <span className="text-xs text-muted-foreground tabular-nums">Step {step} of 2</span>
            )}
          </div>
          <DialogDescription>
            {step === 1
              ? 'Select a repository from GitHub to deploy.'
              : 'Add environment variables for your build (optional).'}
          </DialogDescription>
        </DialogHeader>

        {deployResult ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="text-emerald-400 font-medium">Deployed successfully</p>
            <p className="text-muted-foreground">
              Project ID:{' '}
              <code className="text-foreground/80 font-mono text-xs">{deployResult.projectId}</code>
            </p>
            <Button size="sm" className="mt-2" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleNext} className="w-full space-y-5">
            <GithubRepoList selectedUrl={repoUrl} onSelect={handleRepoSelect} />
            <div className="space-y-1.5">
              <Label htmlFor="project-name">
                Project name{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-app"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!repoUrl}>
                Next
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDeploy} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environment variables</Label>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={envRows.length >= 50}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Add variable
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Prefix with <code className="text-foreground/70">VITE_</code> to expose to your app (e.g.{' '}
                <code className="text-foreground/70">VITE_API_URL</code>).
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {envRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateRow(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="font-mono text-xs flex-1 min-w-0"
                    />
                    <Input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateRow(i, 'value', e.target.value)}
                      placeholder="value"
                      className="text-xs flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={envRows.length === 1}
                      className="text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none pb-0.5 shrink-0"
                      aria-label="Remove variable"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {deployError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {deployError}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={deploying}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={deploying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={deploying} className="gap-2">
                  {deploying && (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  )}
                  {deploying ? 'Deploying…' : 'Deploy'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [githubNotice, setGithubNotice] = useState<'connected' | 'error' | null>(null)

  const deployOpen = searchParams.get('deploy') === 'true'

  const fetchProjects = useCallback(async () => {
    try {
      const { projects } = await api.getProjects()
      setProjects(projects)
    } catch {
      // token may be expired
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const github = searchParams.get('github')
    if (github === 'connected' || github === 'error') {
      setGithubNotice(github)
      router.replace('/dashboard')
      const t = setTimeout(() => setGithubNotice(null), 4000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  function closeDialog() {
    router.replace('/dashboard')
  }

  return (
    <div className="p-6">
      {githubNotice && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg border text-sm ${
            githubNotice === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {githubNotice === 'connected'
            ? 'GitHub connected successfully.'
            : 'Failed to connect GitHub. Please try again.'}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Projects</h1>
      </div>

      {loadingProjects ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">No deployments yet.</p>
          <button
            onClick={() => router.push('/dashboard?deploy=true')}
            className="mt-3 text-sm text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Deploy your first project
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Repo</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Deployed</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  className={`${i !== projects.length - 1 ? 'border-b border-border/60' : ''} hover:bg-muted/30 transition-colors cursor-pointer`}
                >
                  <td className="px-4 py-3 font-medium">{p.projectName}</td>
                  <td className="px-4 py-3">
                    <a
                      href={p.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-48 inline-block"
                    >
                      {p.repoUrl.replace('https://github.com/', '')}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_VARIANT[p.status] ?? 'bg-muted text-muted-foreground border-border'}`}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {p.deployedUrl ? (
                      <a
                        href={p.deployedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/80 hover:text-foreground transition-colors text-xs font-mono underline underline-offset-2"
                      >
                        Open app
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeployDialog
        open={deployOpen}
        onClose={closeDialog}
        onDeployed={() => {
          fetchProjects()
        }}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
