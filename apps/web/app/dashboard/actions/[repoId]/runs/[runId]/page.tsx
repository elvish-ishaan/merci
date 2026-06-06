'use client'

import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { actionsApi, type ActionRun, type ActionJob, type ActionStep, type ActionLog, type CIStatus } from '@/lib/actions-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronDown, ChevronRight, GitCommit, GitPullRequest, RotateCcw } from 'lucide-react'

const STATUS_CLASS: Record<CIStatus, string> = {
  QUEUED:    'bg-muted/60 text-muted-foreground border-border',
  RUNNING:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
  SUCCEEDED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  FAILED:    'bg-red-500/15 text-red-400 border-red-500/20',
  CANCELLED: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  SKIPPED:   'bg-muted/40 text-muted-foreground/60 border-border/60',
}

const ACTIVE: Set<CIStatus> = new Set(['QUEUED', 'RUNNING'])

// ── Realtime run socket ──────────────────────────────────────────────────────

type RunEvent =
  | { type: 'run-status'; status?: CIStatus; conclusion?: string | null; startedAt?: string | null; completedAt?: string | null }
  | { type: 'job-status'; jobId: string; status?: CIStatus; conclusion?: string | null; startedAt?: string | null; completedAt?: string | null }
  | { type: 'step-status'; stepId: string; status?: CIStatus; conclusion?: string | null; startedAt?: string | null; completedAt?: string | null }
  | { type: 'log'; stepId: string; id: string; line: string; stream: string }

type RunSocket = {
  subscribe: (fn: (e: RunEvent) => void) => () => void
  connected: boolean
}

const RunSocketContext = createContext<RunSocket | null>(null)
const useRunSocket = () => useContext(RunSocketContext)

/** Apply only the fields actually present on a status event, preserving timestamps from partial patches. */
function mergeStatus<T extends { status: CIStatus; conclusion: string | null; startedAt: string | null; completedAt: string | null }>(
  prev: T,
  e: { status?: CIStatus; conclusion?: string | null; startedAt?: string | null; completedAt?: string | null },
): T {
  return {
    ...prev,
    ...(e.status !== undefined && { status: e.status }),
    ...(e.conclusion !== undefined && { conclusion: e.conclusion }),
    ...(e.startedAt != null && { startedAt: e.startedAt }),
    ...(e.completedAt != null && { completedAt: e.completedAt }),
  }
}

function StatusBadge({ status }: { status: CIStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[status]}`}>
      {status.toLowerCase()}
    </span>
  )
}

function durationLabel(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function branchFromRef(ref: string) {
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length)
  if (ref.startsWith('refs/tags/')) return ref.slice('refs/tags/'.length)
  return ref
}

function StepRow({ step, runId, jobId }: { step: ActionStep; runId: string; jobId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState<ActionLog[] | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const logBottomRef = useRef<HTMLDivElement>(null)
  const maxLogIdRef = useRef<bigint>(-1n)
  const socket = useRunSocket()

  async function toggle() {
    if (!expanded && logs === null) {
      setLoadingLogs(true)
      try {
        const d = await actionsApi.getStepLogs(runId, jobId, step.id)
        setLogs(d.logs)
        for (const l of d.logs) {
          const n = BigInt(l.id)
          if (n > maxLogIdRef.current) maxLogIdRef.current = n
        }
      } catch {
        setLogs([])
      } finally {
        setLoadingLogs(false)
      }
    }
    setExpanded((v) => !v)
  }

  // Stream new log lines over the run socket while this step is expanded
  useEffect(() => {
    if (!expanded || !socket) return
    return socket.subscribe((e) => {
      if (e.type !== 'log' || e.stepId !== step.id) return
      const n = BigInt(e.id)
      if (n <= maxLogIdRef.current) return
      maxLogIdRef.current = n
      setLogs((prev) => [
        ...(prev ?? []),
        { id: e.id, line: e.line, stream: e.stream, createdAt: new Date().toISOString() },
      ])
    })
  }, [expanded, socket, step.id])

  // Auto-scroll to bottom when new logs arrive while running
  useEffect(() => {
    if (expanded && ACTIVE.has(step.status)) {
      logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, expanded, step.status])

  const duration = durationLabel(step.startedAt, step.completedAt)

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="text-muted-foreground/50 shrink-0 w-4">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <span className="text-xs text-muted-foreground w-5 shrink-0">{step.number + 1}</span>
        <span className="text-xs flex-1 text-left truncate">{step.name}</span>
        <span className="shrink-0"><StatusBadge status={step.status} /></span>
        {duration && <span className="text-xs text-muted-foreground/50 shrink-0">{duration}</span>}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {loadingLogs ? (
            <p className="text-xs text-muted-foreground px-4">Loading logs…</p>
          ) : !logs || logs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-4">
              {ACTIVE.has(step.status) ? 'Waiting for output…' : 'No output'}
            </p>
          ) : (
            <div className="bg-background border border-border rounded p-3 max-h-64 overflow-y-auto font-mono text-xs leading-5 space-y-px">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={log.stream === 'stderr' ? 'text-destructive' : 'text-foreground/75'}
                >
                  {log.line}
                </div>
              ))}
              <div ref={logBottomRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function JobRow({ job, runId }: { job: ActionJob; runId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [steps, setSteps] = useState<ActionStep[] | null>(null)
  const [loadingSteps, setLoadingSteps] = useState(false)
  const socket = useRunSocket()

  async function toggle() {
    if (!expanded && steps === null) {
      setLoadingSteps(true)
      try {
        const d = await actionsApi.getJob(runId, job.id)
        setSteps(d.job.steps)
      } catch {
        setSteps([])
      } finally {
        setLoadingSteps(false)
      }
    }
    setExpanded((v) => !v)
  }

  // Live step-status updates once steps are loaded
  useEffect(() => {
    if (!socket) return
    return socket.subscribe((e) => {
      if (e.type !== 'step-status') return
      setSteps((prev) => (prev ? prev.map((s) => (s.id === e.stepId ? mergeStatus(s, e) : s)) : prev))
    })
  }, [socket])

  const duration = durationLabel(job.startedAt, job.completedAt)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="text-muted-foreground/50 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <span className="font-medium text-sm flex-1 text-left">{job.name}</span>
        <StatusBadge status={job.status} />
        {duration && <span className="text-xs text-muted-foreground">{duration}</span>}
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10">
          {loadingSteps ? (
            <p className="text-xs text-muted-foreground p-4">Loading steps…</p>
          ) : !steps || steps.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No steps</p>
          ) : (
            steps.map((step) => (
              <StepRow key={step.id} step={step} runId={runId} jobId={job.id} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function RunDetailPage() {
  const { repoId, runId } = useParams<{ repoId: string; runId: string }>()
  const router = useRouter()
  const [run, setRun] = useState<(ActionRun & { jobs: ActionJob[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [connected, setConnected] = useState(false)

  // Fan-out registry for run socket events
  const subscribersRef = useRef(new Set<(e: RunEvent) => void>())
  const subscribe = useCallback((fn: (e: RunEvent) => void) => {
    subscribersRef.current.add(fn)
    return () => { subscribersRef.current.delete(fn) }
  }, [])

  async function handleRerun() {
    if (!run) return
    setRerunning(true)
    try {
      const { run: newRun } = await actionsApi.rerunRun(run.id)
      router.push(`/dashboard/actions/${repoId}/runs/${newRun.id}`)
    } catch {
      setRerunning(false)
    }
  }

  const fetchRun = useCallback(async () => {
    try {
      const d = await actionsApi.getRun(runId)
      setRun(d.run)
    } catch {
      router.push(`/dashboard/actions/${repoId}`)
    } finally {
      setLoading(false)
    }
  }, [runId, repoId, router])

  useEffect(() => { fetchRun() }, [fetchRun])

  // Open the realtime run socket; fan messages out to subscribed components
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token || !runId) return

    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3002'
    const ws = new WebSocket(`${wsUrl}/actions/${runId}?token=${encodeURIComponent(token)}`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (event) => {
      let msg: RunEvent
      try {
        msg = JSON.parse(event.data as string) as RunEvent
      } catch {
        return
      }
      for (const fn of subscribersRef.current) fn(msg)
    }

    return () => ws.close()
  }, [runId])

  // Page-level state: keep run + job badges in sync from the socket
  useEffect(() => {
    return subscribe((e) => {
      if (e.type === 'run-status') {
        setRun((prev) => (prev ? mergeStatus(prev, e) : prev))
      } else if (e.type === 'job-status') {
        setRun((prev) =>
          prev
            ? { ...prev, jobs: prev.jobs.map((j) => (j.id === e.jobId ? mergeStatus(j, e) : j)) }
            : prev,
        )
      }
    })
  }, [subscribe])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (!run) return null

  const branch = branchFromRef(run.ref)
  const duration = durationLabel(run.startedAt, run.completedAt)

  return (
    <RunSocketContext.Provider value={{ subscribe, connected }}>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-0.5 p-1 h-auto"
          onClick={() => router.push(`/dashboard/actions/${repoId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-semibold font-mono">{run.workflowFile}</h1>
            <StatusBadge status={run.status} />
            {ACTIVE.has(run.status) && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                {connected ? 'Live' : 'Reconnecting…'}
              </span>
            )}
            {!ACTIVE.has(run.status) && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7 px-2.5 text-xs gap-1.5"
                onClick={handleRerun}
                disabled={rerunning}
              >
                <RotateCcw className={`w-3 h-3 ${rerunning ? 'animate-spin' : ''}`} />
                {rerunning ? 'Re-running…' : 'Re-run'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {run.event === 'push'
                ? <GitCommit className="w-3 h-3" />
                : <GitPullRequest className="w-3 h-3" />
              }
              {run.event}
            </span>
            <span>·</span>
            <span>{branch}</span>
            <span>·</span>
            <span className="font-mono">{run.sha.slice(0, 7)}</span>
            {duration && <><span>·</span><span>{duration}</span></>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Event', value: run.event },
          { label: 'Branch', value: branch },
          { label: 'Commit', value: run.sha.slice(0, 7) },
          { label: 'Jobs', value: String(run.jobs.length) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/40 border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-medium font-mono truncate">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-foreground/80 mb-3">Jobs ({run.jobs.length})</h2>

      {run.jobs.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">No jobs queued</p>
        </div>
      ) : (
        <div className="space-y-3">
          {run.jobs.map((job) => (
            <JobRow key={job.id} job={job} runId={runId} />
          ))}
        </div>
      )}
    </div>
    </RunSocketContext.Provider>
  )
}
