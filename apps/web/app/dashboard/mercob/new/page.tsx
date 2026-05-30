'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ScheduleKind, type CreateMercobJobInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select'
import { ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type MercioFn = { id: string; name: string; status: string }

export default function NewMercobJobPage() {
  const router = useRouter()
  const [functions, setFunctions] = useState<MercioFn[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [name, setName] = useState('')
  const [functionId, setFunctionId] = useState('')
  const [recurring, setRecurring] = useState(true)
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('DAILY')

  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1])
  const [intervalValue, setIntervalValue] = useState(60)
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>('minutes')
  const [cronExpr, setCronExpr] = useState('0 9 * * *')
  const [runAt, setRunAt] = useState('')

  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/')
  const [body, setBody] = useState('')
  const [maxRetries, setMaxRetries] = useState(0)
  const [timeoutMs, setTimeoutMs] = useState(30000)

  useEffect(() => {
    api.getMercioFunctions()
      .then((d) => setFunctions(d.functions))
      .catch((err) => setError(err?.message ?? 'Failed to load functions'))
  }, [])

  function toggleDay(d: number) {
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!functionId) { setError('Select a function'); return }

    setSubmitting(true)
    setError(null)

    const intervalSec = scheduleKind === 'INTERVAL'
      ? intervalValue * (intervalUnit === 'hours' ? 3600 : 60)
      : undefined

    const payload: CreateMercobJobInput = {
      name: name.trim(),
      functionId,
      recurring: scheduleKind === 'ONCE' ? false : recurring,
      scheduleKind,
      ...(scheduleKind === 'DAILY' && { timeOfDay }),
      ...(scheduleKind === 'WEEKLY' && { timeOfDay, daysOfWeek }),
      ...(scheduleKind === 'INTERVAL' && { intervalSec }),
      ...(scheduleKind === 'CRON' && { cronExpr }),
      ...(scheduleKind === 'ONCE' && { runAt }),
      method,
      path,
      ...(body.trim() && { body: body.trim() }),
      maxRetries,
      timeoutMs,
    }

    try {
      await api.createMercobJob(payload)
      router.push('/dashboard/mercob')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Scheduled Job</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure a function to run on a schedule</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="job-name">Job name</Label>
          <Input
            id="job-name"
            placeholder="daily-sync"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Function</Label>
          <Select value={functionId} onValueChange={setFunctionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a function…" />
            </SelectTrigger>
            <SelectContent>
              {functions.length === 0 && (
                <SelectItem value="__empty__" disabled>No functions found</SelectItem>
              )}
              {functions.filter((f) => f.status === 'DEPLOYED').length > 0 && (
                <SelectGroup>
                  <SelectLabel>Deployed</SelectLabel>
                  {functions.filter((f) => f.status === 'DEPLOYED').map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {functions.filter((f) => f.status !== 'DEPLOYED').length > 0 && (
                <>
                  {functions.filter((f) => f.status === 'DEPLOYED').length > 0 && <SelectSeparator />}
                  <SelectGroup>
                    <SelectLabel>Not ready</SelectLabel>
                    {functions.filter((f) => f.status !== 'DEPLOYED').map((f) => (
                      <SelectItem key={f.id} value={f.id} disabled>
                        {f.name} <span className="text-muted-foreground ml-1">({f.status})</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Schedule</Label>
          <Select value={scheduleKind} onValueChange={(v) => setScheduleKind(v as ScheduleKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Every day</SelectItem>
              <SelectItem value="WEEKLY">Specific days of week</SelectItem>
              <SelectItem value="INTERVAL">Every N minutes / hours</SelectItem>
              <SelectItem value="CRON">Cron expression</SelectItem>
              <SelectItem value="ONCE">Once at a specific time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(scheduleKind === 'DAILY' || scheduleKind === 'WEEKLY') && (
          <div className="space-y-1.5">
            <Label htmlFor="time-of-day">Time (UTC)</Label>
            <Input
              id="time-of-day"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-36"
            />
          </div>
        )}

        {scheduleKind === 'WEEKLY' && (
          <div className="space-y-1.5">
            <Label>Days of week</Label>
            <div className="flex gap-1.5">
              {DAYS.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    daysOfWeek.includes(i)
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-ring/50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {scheduleKind === 'INTERVAL' && (
          <div className="space-y-1.5">
            <Label>Interval</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
                className="w-24"
              />
              <Select value={intervalUnit} onValueChange={(v) => setIntervalUnit(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">minutes</SelectItem>
                  <SelectItem value="hours">hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {scheduleKind === 'CRON' && (
          <div className="space-y-1.5">
            <Label htmlFor="cron-expr">Cron expression (UTC)</Label>
            <Input
              id="cron-expr"
              placeholder="0 9 * * *"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">min hour day month weekday</p>
          </div>
        )}

        {scheduleKind === 'ONCE' && (
          <div className="space-y-1.5">
            <Label htmlFor="run-at">Run at (UTC)</Label>
            <Input
              id="run-at"
              type="datetime-local"
              value={runAt}
              onChange={(e) => setRunAt(e.target.value)}
            />
          </div>
        )}

        {scheduleKind !== 'ONCE' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Recurring</p>
              <p className="text-xs text-muted-foreground">Keep repeating after each run</p>
            </div>
            <Switch
              checked={recurring}
              onCheckedChange={setRecurring}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-4 border border-border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adv-method">HTTP method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adv-path">Path</Label>
                <Input
                  id="adv-path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="/"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adv-body">
                Request body <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="adv-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder='{"key": "value"}'
                className="w-full bg-input/30 border border-input rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adv-retries">Max retries</Label>
                <Input
                  id="adv-retries"
                  type="number"
                  min={0}
                  max={10}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adv-timeout">Timeout (ms)</Label>
                <Input
                  id="adv-timeout"
                  type="number"
                  min={1000}
                  step={1000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? 'Creating…' : 'Create Job'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/dashboard/mercob')}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
