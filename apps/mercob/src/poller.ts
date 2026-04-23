import prisma from '@repo/db'
import { logger } from './lib/logger'
import { dispatch } from './dispatch'

const LOOK_AHEAD_MS = 60_000
const CONCURRENCY = 10

export function startPoller(): NodeJS.Timeout {
  const tick = async () => {
    const horizon = new Date(Date.now() + LOOK_AHEAD_MS)
    let jobs: Awaited<ReturnType<typeof prisma.scheduledJob.findMany>>

    try {
      jobs = await prisma.scheduledJob.findMany({
        where: { active: true, nextRunAt: { lte: horizon } },
      })
    } catch (err) {
      logger.error({ err }, 'mercob poller: db query failed')
      return
    }

    if (jobs.length === 0) return
    logger.info({ count: jobs.length }, 'mercob poller: dispatching jobs')

    // Bounded concurrency
    const chunks: typeof jobs[] = []
    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      chunks.push(jobs.slice(i, i + CONCURRENCY))
    }
    for (const chunk of chunks) {
      await Promise.allSettled(chunk.map((job) => dispatch(job)))
    }
  }

  // Run immediately on start, then every minute
  tick().catch((err) => logger.error({ err }, 'mercob tick error'))
  return setInterval(() => {
    tick().catch((err) => logger.error({ err }, 'mercob tick error'))
  }, 60_000)
}
