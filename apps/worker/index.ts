import { createWorker, createMercioWorker } from './src/worker'
import { logger } from './src/lib/logger'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const worker = createWorker()
const mercioWorker = createMercioWorker()

logger.info('worker started, waiting for jobs')

process.on('SIGINT', async () => {
  logger.info('shutting down workers')
  await Promise.all([worker.close(), mercioWorker.close()])
  process.exit(0)
})
