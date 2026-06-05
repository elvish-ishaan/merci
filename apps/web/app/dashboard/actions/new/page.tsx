'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { actionsApi } from '@/lib/actions-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, GitBranch, Lock, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface GithubRepo {
  id: number
  fullName: string
  private: boolean
  description: string | null
  updatedAt: string
}

export default function NewActionRepoPage() {
  const router = useRouter()
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null)
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [filtered, setFiltered] = useState<GithubRepo[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const status = await api.getGithubStatus()
        setGithubConnected(status.connected)
        if (status.connected) {
          const data = await api.getGithubRepos()
          setRepos(data.repos)
          setFiltered(data.repos)
        }
      } catch {
        setGithubConnected(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const q = query.toLowerCase()
    setFiltered(q ? repos.filter((r) => r.fullName.toLowerCase().includes(q)) : repos)
  }, [query, repos])

  async function handleRegister(fullName: string) {
    setRegistering(fullName)
    setError(null)
    try {
      const data = await actionsApi.registerRepo(fullName)
      router.push(`/dashboard/actions/${data.repo.id}`)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to connect repo')
      setRegistering(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-0.5 p-1 h-auto"
          onClick={() => router.push('/dashboard/actions')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Connect a repo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a GitHub repo to install a webhook and enable CI runs
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !githubConnected ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Connect your GitHub account first to see your repos.</p>
          <Button size="sm" onClick={() => api.connectGithub()}>Connect GitHub</Button>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter repos…"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="border border-border rounded-lg divide-y divide-border max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No repos found</div>
            ) : (
              filtered.map((repo) => (
                <div key={repo.id} className="p-3 flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{repo.fullName}</span>
                      {repo.private && (
                        <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={registering === repo.fullName}
                    onClick={() => handleRegister(repo.fullName)}
                  >
                    {registering === repo.fullName ? 'Connecting…' : 'Connect'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
