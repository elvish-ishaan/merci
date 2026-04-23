import { CronExpressionParser } from 'cron-parser'
import type { ScheduleKind } from '@repo/db'

export interface JobSchedule {
  scheduleKind: ScheduleKind
  timeOfDay?: string | null
  daysOfWeek: number[]
  intervalSec?: number | null
  cronExpr?: string | null
  runAt?: Date | null
}

export function computeNextRunAt(job: JobSchedule, from: Date = new Date()): Date | null {
  switch (job.scheduleKind) {
    case 'INTERVAL': {
      if (!job.intervalSec) return null
      return new Date(from.getTime() + job.intervalSec * 1000)
    }
    case 'DAILY': {
      const [h, m] = (job.timeOfDay ?? '00:00').split(':').map(Number)
      const next = new Date(from)
      next.setUTCHours(h!, m!, 0, 0)
      if (next <= from) next.setUTCDate(next.getUTCDate() + 1)
      return next
    }
    case 'WEEKLY': {
      const [h, m] = (job.timeOfDay ?? '00:00').split(':').map(Number)
      const days = job.daysOfWeek.length ? job.daysOfWeek : [0]
      for (let offset = 1; offset <= 7; offset++) {
        const candidate = new Date(from)
        candidate.setUTCDate(from.getUTCDate() + offset)
        candidate.setUTCHours(h!, m!, 0, 0)
        if (days.includes(candidate.getUTCDay())) return candidate
      }
      return null
    }
    case 'CRON': {
      if (!job.cronExpr) return null
      const interval = CronExpressionParser.parse(job.cronExpr, { currentDate: from })
      return interval.next().toDate()
    }
    case 'ONCE': {
      return job.runAt ?? null
    }
    default:
      return null
  }
}
