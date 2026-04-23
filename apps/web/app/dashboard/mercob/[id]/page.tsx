'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type MercobJob, type MercobRun, type JobRunStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Play, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const RUN_STATUS_CLASS: Record<JobRunStatus, string> = {
  SUCCEEDED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  RUNNING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  QUEUED: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
  TIMEOUT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

function scheduleLabel(job: MercobJob): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  switch (job.scheduleKind) {
    case 'DAILY': return `Every day at ${job.timeOfDay ?? '00:00'} UTC`
    case 'WEEKLY': return `Weekly on ${(job.daysOfWeek ?? []).map((d) => DAYS[d]).join(', ')} at ${job.timeOfDay ?? '00:00'} UTC`
    case 'INTERVAL': {
      const sec = job.intervalSec ?? 0
      if (sec >= 3600) return `Every ${sec / 3600}h`
      if (sec >= 60) return `Every ${sec / 60}m`
      return `Every ${sec}s`
    }
    case 'CRON': return `Cron: ${job.cronExpr}`
    case 'ONCE': return `Once at ${job.runAt ? new Date(job.runAt).toLocaleString() : '—'}`
    default: return '—'
  }
}

function RunRow({ run }: { run: MercobRun }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function expand() {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        const d = await api.getMercobRun(run.id)
        setDetail(d.run)
      } catch {
        // ignore
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded((v) => !v)
  }

  const statusClass = RUN_STATUS_CLASS[run.status as JobRunStatus] ?? ''

  return (
    <div className="border-b border-neutral-800 last:border-0">
      <button
        onClick={expand}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-800/40 transition-colors"
      >
        <span className="text-neutral-600 w-4 shrink-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${statusClass}`}>
          {run.status}
        </span>
        <span className="text-xs text-neutral-400 flex-1 text-left">
          {new Date(run.scheduledFor).toLocaleString()}
        </span>
        {run.httpStatus && (
          <span className="text-xs text-neutral-500 shrink-0">HTTP {run.httpStatus}</span>
        )}
        {run.durationMs && (
          <span className="text-xs text-neutral-600 shrink-0">{run.durationMs}ms</span>
        )}
        <span className="text-xs text-neutral-700 shrink-0">attempt {run.attempt}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {loadingDetail ? (
            <p className="text-xs text-neutral-500">Loading…</p>
          ) : detail ? (
            <>
              {detail.errorMessage && (
                <div className="rounded bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">{detail.errorMessage}</p>
                </div>
              )}
              {detail.responseBody && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Response body</p>
                  <pre className="text-xs bg-neutral-900 border border-neutral-800 rounded p-3 overflow-x-auto text-neutral-300 whitespace-pre-wrap break-all">
                    {detail.responseBody}
                  </pre>
                </div>
              )}
              {detail.logs && detail.logs.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Logs</p>
                  <div className="bg-neutral-950 border border-neutral-800 rounded p-3 space-y-0.5 max-h-48 overflow-y-auto">
                    {detail.logs.map((log: any) => (
                      <p
                        key={log.id}
                        className={`text-xs font-mono ${log.stream === 'stderr' ? 'text-red-400' : 'text-neutral-400'}`}
                      >
                        {log.line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-neutral-500">No details available</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MercobJobPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<MercobJob | null>(null)
  const [runs, setRuns] = useState<MercobRun[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchJob = useCallback(async () => {
    try {
      const d = await api.getMercobJob(id)
      setJob(d.job)
    } catch {
      router.push('/dashboard/mercob')
    }
  }, [id, router])

  const fetchRuns = useCallback(async (p: number) => {
    try {
      const d = await api.getMercobRuns(id, p)
      setRuns(d.runs)
      setTotal(d.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchJob()
    fetchRuns(1)
  }, [fetchJob, fetchRuns])

  async function handleToggleActive() {
    if (!job) return
    try {
      await api.updateMercobJob(job.id, { active: !job.active })
      setJob((j) => j ? { ...j, active: !j.active } : j)
    } catch (err: any) {
      alert(err?.message ?? 'Failed')
    }
  }

  async function handleTrigger() {
    if (!job) return
    setTriggering(true)
    try {
      await api.triggerMercobJob(job.id)
      await fetchRuns(1)
    } catch (err: any) {
      alert(err?.message ?? 'Trigger failed')
    } finally {
      setTriggering(false)
    }
  }

  async function handleDelete() {
    if (!job || !confirm(`Delete job "${job.name}"?`)) return
    await api.deleteMercobJob(job.id)
    router.push('/dashboard/mercob')
  }

  async function changePage(p: number) {
    setPage(p)
    await fetchRuns(p)
  }

  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading…</div>
  if (!job) return null

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-500 hover:text-white mt-0.5 p-1 h-auto"
          onClick={() => router.push('/dashboard/mercob')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{job.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${job.active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
              {job.active ? 'active' : 'paused'}
            </span>
          </div>
          <div className="text-sm text-neutral-400 mt-1 space-x-3">
            <span>{scheduleLabel(job)}</span>
            <span>·</span>
            <span>fn: {job.function?.name ?? job.functionId}</span>
            {job.nextRunAt && job.active && (
              <>
                <span>·</span>
                <span>next: {new Date(job.nextRunAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={job.active}
            onCheckedChange={handleToggleActive}
            className="data-[state=checked]:bg-emerald-600"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={triggering}
            onClick={handleTrigger}
            className="border-neutral-700 text-neutral-300 hover:text-white gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            Run now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-red-400 p-1 h-auto"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Recurring', value: job.recurring ? 'Yes' : 'No' },
          { label: 'Max retries', value: String(job.maxRetries) },
          { label: 'Timeout', value: `${job.timeoutMs / 1000}s` },
          { label: 'Last run', value: job.lastRunAt ? new Date(job.lastRunAt).toLocaleDateString() : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Run history */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-300 mb-3">Run history ({total})</h2>
        {runs.length === 0 ? (
          <div className="border border-neutral-800 rounded-lg p-8 text-center">
            <p className="text-sm text-neutral-500">No runs yet</p>
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg">
            {runs.map((run) => <RunRow key={run.id} run={run} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className="text-neutral-400"
            >
              Previous
            </Button>
            <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => changePage(page + 1)}
              className="text-neutral-400"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
