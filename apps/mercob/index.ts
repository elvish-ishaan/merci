import { startPoller } from './src/poller'
import { logger } from './src/lib/logger'

const REQUIRED = ['DATABASE_URL', 'REDIS_HOST', 'WORKER_SECRET']
for (const key of REQUIRED) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}

const timer = startPoller()
logger.info('mercob poller started')

process.on('SIGINT', () => {
  clearInterval(timer)
  logger.info('mercob shutting down')
  process.exit(0)
})
