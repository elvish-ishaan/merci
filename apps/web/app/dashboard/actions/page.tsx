'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { actionsApi, type ActionRepo } from '@/lib/actions-api'
import { Button } from '@/components/ui/button'
import { GitBranch, Plus, Trash2 } from 'lucide-react'

export default function ActionsPage() {
  const [repos, setRepos] = useState<ActionRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchRepos = useCallback(async () => {
    try {
      const data = await actionsApi.getRepos()
      setRepos(data.repos)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRepos() }, [fetchRepos])

  async function handleDelete(repo: ActionRepo) {
    if (!confirm(`Disconnect "${repo.repoFullName}"? This will also remove all run history and secrets.`)) return
    setDeleting(repo.id)
    try {
      await actionsApi.deleteRepo(repo.id)
      setRepos((prev) => prev.filter((r) => r.id !== repo.id))
    } catch (err: any) {
      alert(err?.message ?? 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Actions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">GitHub Actions-compatible CI runner for your repos</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/actions/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Connect repo
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : repos.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <GitBranch className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No repos connected yet.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/dashboard/actions/new">Connect your first repo</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {repos.map((repo) => (
            <div key={repo.id} className="p-4 flex items-center gap-4">
              <GitBranch className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/actions/${repo.id}`}
                  className="font-medium text-sm hover:text-muted-foreground transition-colors"
                >
                  {repo.repoFullName}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {repo._count.runs} {repo._count.runs === 1 ? 'run' : 'runs'} · connected {new Date(repo.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 shrink-0"
                disabled={deleting === repo.id}
                onClick={() => handleDelete(repo)}
                title="Disconnect repo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
