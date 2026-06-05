import { createActionWorker } from './src/worker'
import { logger } from './src/lib/logger'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')
if (!process.env['ENV_ENCRYPTION_KEY']) throw new Error('ENV_ENCRYPTION_KEY env var is required')

const worker = createActionWorker()

async function shutdown() {
  logger.info('shutting down action worker')
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
