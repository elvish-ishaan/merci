import { createRuntimeWorker } from './src/runtime'
import { logger } from './src/lib/logger'

const REQUIRED = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'REDIS_HOST']
for (const key of REQUIRED) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}

const worker = createRuntimeWorker()

logger.info('mercio-runtime started, waiting for invocation jobs')

process.on('SIGINT', async () => {
  logger.info('mercio-runtime shutting down')
  await worker.close()
  process.exit(0)
})
