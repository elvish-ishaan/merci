'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api, type MercobJob, type JobRunStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Clock, Play, Trash2, Plus } from 'lucide-react'

const RUN_STATUS_CLASS: Record<JobRunStatus, string> = {
  SUCCEEDED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  RUNNING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  QUEUED: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
  TIMEOUT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
}

function scheduleLabel(job: MercobJob): string {
  switch (job.scheduleKind) {
    case 'DAILY': return `Daily at ${job.timeOfDay ?? '00:00'} UTC`
    case 'WEEKLY': {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const names = (job.daysOfWeek ?? []).map((d) => days[d]).join(', ')
      return `Weekly on ${names || 'Sun'} at ${job.timeOfDay ?? '00:00'} UTC`
    }
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

export default function MercobPage() {
  const [jobs, setJobs] = useState<MercobJob[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.getMercobJobs()
      setJobs(data.jobs)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function toggleActive(job: MercobJob) {
    try {
      await api.updateMercobJob(job.id, { active: !job.active })
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, active: !j.active } : j))
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update')
    }
  }

  async function handleTrigger(job: MercobJob) {
    setTriggering(job.id)
    try {
      await api.triggerMercobJob(job.id)
    } catch (err: any) {
      alert(err?.message ?? 'Trigger failed')
    } finally {
      setTriggering(null)
    }
  }

  async function handleDelete(job: MercobJob) {
    if (!confirm(`Delete job "${job.name}"?`)) return
    try {
      await api.deleteMercobJob(job.id)
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err: any) {
      alert(err?.message ?? 'Delete failed')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Mercob</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Schedule serverless functions to run automatically</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/mercob/new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Job
          </Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-12 text-center">
          <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400 text-sm">No scheduled jobs yet.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/dashboard/mercob/new">Create your first job</Link>
          </Button>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
          {jobs.map((job) => {
            const lastRun = job.runs?.[0]
            const statusClass = lastRun
              ? RUN_STATUS_CLASS[lastRun.status as JobRunStatus] ?? ''
              : ''

            return (
              <div key={job.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/dashboard/mercob/${job.id}`}
                      className="font-medium text-sm hover:text-neutral-300 transition-colors"
                    >
                      {job.name}
                    </Link>
                    {lastRun && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
                        {lastRun.status}
                      </span>
                    )}
                    {!job.active && (
                      <span className="text-xs text-neutral-600">paused</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>{scheduleLabel(job)}</span>
                    <span>·</span>
                    <span>fn: {job.function?.name ?? job.functionId.slice(0, 8)}</span>
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
                    onCheckedChange={() => toggleActive(job)}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500 hover:text-white h-7 w-7 p-0"
                    disabled={triggering === job.id}
                    onClick={() => handleTrigger(job)}
                    title="Run now"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500 hover:text-red-400 h-7 w-7 p-0"
                    onClick={() => handleDelete(job)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
