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

  function handleNext(e: FormEvent) {
    e.preventDefault()
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
      <DialogContent className={`${step === 2 ? 'sm:max-w-lg' : 'sm:max-w-md'} bg-neutral-950 border-neutral-800`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New deployment</DialogTitle>
            {!deployResult && (
              <span className="text-xs text-neutral-500">Step {step} of 2</span>
            )}
          </div>
          <DialogDescription className="text-neutral-400">
            {step === 1
              ? 'Paste a public GitHub repo URL to clone and deploy.'
              : 'Add environment variables for your build (optional).'}
          </DialogDescription>
        </DialogHeader>

        {deployResult ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="text-emerald-400 font-medium">Deployed successfully</p>
            <p className="text-neutral-400">
              Project ID:{' '}
              <code className="text-neutral-200 font-mono text-xs">{deployResult.projectId}</code>
            </p>
            <Button size="sm" className="mt-2" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="repo-url">GitHub repo URL</Label>
              <Input
                id="repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                placeholder="https://github.com/user/repo"
                className="bg-neutral-900 border-neutral-800 focus:border-neutral-600 placeholder:text-neutral-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-name">
                Project name{' '}
                <span className="text-neutral-500 font-normal">(optional)</span>
              </Label>
              <Input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-app"
                className="bg-neutral-900 border-neutral-800 focus:border-neutral-600 placeholder:text-neutral-600"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDeploy} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environment variables</Label>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={envRows.length >= 50}
                  className="text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Add variable
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                Prefix with <code className="text-neutral-400">VITE_</code> to expose to your app (e.g.{' '}
                <code className="text-neutral-400">VITE_API_URL</code>).
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {envRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateRow(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="bg-neutral-900 border-neutral-800 focus:border-neutral-600 placeholder:text-neutral-600 font-mono text-xs flex-1"
                    />
                    <Input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateRow(i, 'value', e.target.value)}
                      placeholder="value"
                      className="bg-neutral-900 border-neutral-800 focus:border-neutral-600 placeholder:text-neutral-600 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={envRows.length === 1}
                      className="text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none pb-0.5"
                      aria-label="Remove variable"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {deployError && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {deployError}
              </p>
            )}

            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={deploying}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={deploying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={deploying} className="gap-2">
                  {deploying && (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

  function closeDialog() {
    router.replace('/dashboard')
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">Projects</h1>

      {loadingProjects ? (
        <p className="text-neutral-500 text-sm">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-xl px-6 py-12 text-center">
          <p className="text-neutral-500 text-sm">
            No deployments yet.{' '}
            <button
              onClick={() => router.push('/dashboard?deploy=true')}
              className="text-neutral-300 hover:text-white underline underline-offset-2 transition-colors"
            >
              Deploy your first project
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Repo</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Deployed</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">URL</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  className={`${i !== projects.length - 1 ? 'border-b border-neutral-800/60' : ''} hover:bg-neutral-900/40 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium">{p.projectName}</td>
                  <td className="px-4 py-3">
                    <a
                      href={p.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white transition-colors truncate max-w-48 inline-block"
                    >
                      {p.repoUrl.replace('https://github.com/', '')}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_VARIANT[p.status] ?? 'bg-neutral-700 text-neutral-300'}`}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
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
                        className="text-blue-400 hover:text-blue-300 transition-colors text-xs font-mono underline underline-offset-2"
                      >
                        Open app
                      </a>
                    ) : (
                      <span className="text-neutral-600 text-xs">—</span>
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
