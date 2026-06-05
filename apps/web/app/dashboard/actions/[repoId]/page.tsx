'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { actionsApi, type ActionRepo, type ActionRun, type CIStatus } from '@/lib/actions-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, KeyRound, GitCommit, GitPullRequest, RefreshCw } from 'lucide-react'

const STATUS_CLASS: Record<CIStatus, string> = {
  QUEUED:    'bg-muted/60 text-muted-foreground border-border',
  RUNNING:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
  SUCCEEDED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  FAILED:    'bg-red-500/15 text-red-400 border-red-500/20',
  CANCELLED: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  SKIPPED:   'bg-muted/40 text-muted-foreground/60 border-border/60',
}

function StatusBadge({ status }: { status: CIStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[status]}`}>
      {status.toLowerCase()}
    </span>
  )
}

function branchFromRef(ref: string) {
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length)
  if (ref.startsWith('refs/tags/')) return ref.slice('refs/tags/'.length)
  return ref
}

export default function RepoDetailPage() {
  const { repoId } = useParams<{ repoId: string }>()
  const router = useRouter()
  const [repo, setRepo] = useState<ActionRepo | null>(null)
  const [runs, setRuns] = useState<ActionRun[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchRepo = useCallback(async () => {
    try {
      const d = await actionsApi.getRepo(repoId)
      setRepo(d.repo)
    } catch {
      router.push('/dashboard/actions')
    }
  }, [repoId, router])

  const fetchRuns = useCallback(async (p: number) => {
    try {
      const d = await actionsApi.getRuns(repoId, p)
      setRuns(d.runs)
      setTotal(d.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [repoId])

  useEffect(() => {
    fetchRepo()
    fetchRuns(1)
  }, [fetchRepo, fetchRuns])

  async function handleSyncWebhook() {
    setSyncing(true)
    try {
      await actionsApi.syncWebhook(repoId)
      alert('Webhook synced successfully.')
    } catch (err: any) {
      alert(err?.message ?? 'Webhook sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function changePage(p: number) {
    setPage(p)
    await fetchRuns(p)
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!repo) return null

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-0.5 p-1 h-auto"
          onClick={() => router.push('/dashboard/actions')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold">{repo.repoFullName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} {total === 1 ? 'run' : 'runs'} · connected {new Date(repo.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={syncing}
          onClick={handleSyncWebhook}
          title="Re-register the GitHub webhook with the correct URL"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync webhook
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Link href={`/dashboard/actions/${repoId}/secrets`}>
            <KeyRound className="w-3.5 h-3.5" />
            Secrets
          </Link>
        </Button>
      </div>

      <h2 className="text-sm font-semibold text-foreground/80 mb-3">Run history</h2>

      {runs.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No runs yet. Push a commit or open a pull request to trigger your first workflow.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Workflow</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Trigger</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Commit</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/actions/${repoId}/runs/${run.id}`)}
                >
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                    {run.workflowFile}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {run.event === 'push'
                        ? <GitCommit className="w-3 h-3 shrink-0" />
                        : <GitPullRequest className="w-3 h-3 shrink-0" />
                      }
                      <span className="truncate max-w-[120px]">{branchFromRef(run.ref)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {run.sha.slice(0, 7)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {run.startedAt
                      ? new Date(run.startedAt).toLocaleString()
                      : new Date(run.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => changePage(page - 1)} className="text-muted-foreground">
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => changePage(page + 1)} className="text-muted-foreground">
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
