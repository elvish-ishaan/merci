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

const STATUS_VARIANT: Record<string, string> = {
  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  UPLOADING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CLONING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
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
  const [repoUrl, setRepoUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [deployResult, setDeployResult] = useState<{ projectId: string; status: string } | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      setRepoUrl('')
      setProjectName('')
      setDeployError('')
      setDeployResult(null)
      onClose()
    }
  }

  async function handleDeploy(e: FormEvent) {
    e.preventDefault()
    setDeployError('')
    setDeployResult(null)
    setDeploying(true)
    try {
      const result = await api.deploy(repoUrl, projectName || undefined)
      setDeployResult(result)
      setRepoUrl('')
      setProjectName('')
      onDeployed()
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-950 border-neutral-800">
        <DialogHeader>
          <DialogTitle>New deployment</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Paste a public GitHub repo URL to clone and deploy.
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
        ) : (
          <form onSubmit={handleDeploy} className="space-y-4">
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

            {deployError && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {deployError}
              </p>
            )}

            <div className="flex justify-end gap-2">
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
