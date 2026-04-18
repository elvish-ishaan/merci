'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'

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

const STATUS_STYLES: Record<string, string> = {
  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  UPLOADING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  CLONING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [repoUrl, setRepoUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [deployResult, setDeployResult] = useState<{ projectId: string; status: string } | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)

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
    if (!localStorage.getItem('token')) {
      router.replace('/login')
      return
    }
    fetchProjects()
  }, [router, fetchProjects])

  function logout() {
    localStorage.removeItem('token')
    router.push('/login')
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
      fetchProjects()
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">mercy</span>
        <button
          onClick={logout}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Deploy form */}
        <section>
          <h2 className="text-lg font-semibold mb-1">New deployment</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Paste a public GitHub repo URL to clone and upload to storage.
          </p>

          <form onSubmit={handleDeploy} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">GitHub repo URL</label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                placeholder="https://github.com/user/repo"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-600 placeholder:text-neutral-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">
                Project name{' '}
                <span className="text-neutral-600">(optional — defaults to repo name)</span>
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-app"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-600 placeholder:text-neutral-600 transition-colors"
              />
            </div>

            {deployError && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {deployError}
              </p>
            )}

            {deployResult && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="text-emerald-400 font-medium">Deployed successfully</p>
                <p className="text-neutral-400">
                  Project ID:{' '}
                  <code className="text-neutral-200 font-mono text-xs">{deployResult.projectId}</code>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={deploying}
              className="bg-white text-black font-medium text-sm px-5 py-2 rounded-lg hover:bg-neutral-200 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {deploying && (
                <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              )}
              {deploying ? 'Deploying…' : 'Deploy'}
            </button>
          </form>
        </section>

        {/* Projects table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Projects</h2>

          {loadingProjects ? (
            <p className="text-neutral-500 text-sm">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="border border-dashed border-neutral-800 rounded-xl px-6 py-10 text-center">
              <p className="text-neutral-500 text-sm">No deployments yet. Deploy your first project above.</p>
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
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[p.status] ?? 'bg-neutral-700 text-neutral-300'}`}
                        >
                          {p.status}
                        </span>
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
        </section>
      </main>
    </div>
  )
}
