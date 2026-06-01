'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Project = {
  id: string
  projectName: string
  repoUrl: string
  status: string
  bucketPrefix: string | null
  deployedUrl: string | null
  subdomain: string
  envVarCount: number
  createdAt: string
  updatedAt: string
}

const STATUS_VARIANT: Record<string, string> = {
  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  UPLOADING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CLONING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  BUILDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  QUEUED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeploying, setRedeploying] = useState(false)
  const [redeployError, setRedeployError] = useState('')

  const fetchProject = useCallback(async () => {
    try {
      const { project } = await api.getProject(id)
      setProject(project)
    } catch {
      // handled by redirect in layout if token is missing
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  async function handleRedeploy() {
    if (!project) return
    setRedeployError('')
    setRedeploying(true)
    try {
      await api.redeployProject(id)
      setProject((p) => p ? { ...p, status: 'QUEUED' } : p)
    } catch (err) {
      setRedeployError(err instanceof Error ? err.message : 'Redeploy failed')
    } finally {
      setRedeploying(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  if (!project) {
    return <div className="p-6 text-sm text-destructive">Project not found.</div>
  }

  const canRedeploy = project.status === 'DEPLOYED' || project.status === 'FAILED'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl font-semibold truncate">{project.projectName}</h1>
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_VARIANT[project.status] ?? 'bg-muted text-muted-foreground border-border'}`}
          >
            {project.status}
          </Badge>
        </div>
        <div className="shrink-0">
          <Button
            onClick={handleRedeploy}
            disabled={!canRedeploy || redeploying}
            size="sm"
            className="gap-2"
          >
            {redeploying && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            )}
            {redeploying ? 'Queuing…' : 'Redeploy'}
          </Button>
        </div>
      </div>

      {redeployError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {redeployError}
        </p>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border/60">
              <td className="px-4 py-3 text-muted-foreground font-medium w-36">Repository</td>
              <td className="px-4 py-3">
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground transition-colors underline underline-offset-2 break-all"
                >
                  {project.repoUrl.replace('https://github.com/', '')}
                </a>
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="px-4 py-3 text-muted-foreground font-medium">URL</td>
              <td className="px-4 py-3">
                {project.deployedUrl ? (
                  <a
                    href={project.deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/80 hover:text-foreground transition-colors font-mono text-xs underline underline-offset-2"
                  >
                    {project.deployedUrl}
                  </a>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="px-4 py-3 text-muted-foreground font-medium">Env vars</td>
              <td className="px-4 py-3 text-foreground/70">{project.envVarCount}</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="px-4 py-3 text-muted-foreground font-medium">Created</td>
              <td className="px-4 py-3 text-foreground/70 text-xs">
                {new Date(project.createdAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-muted-foreground font-medium">Last updated</td>
              <td className="px-4 py-3 text-foreground/70 text-xs">
                {new Date(project.updatedAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
