import { createRuntimeWorker } from './src/runtime'

const REQUIRED = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'REDIS_HOST']
for (const key of REQUIRED) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
}

const worker = createRuntimeWorker()

console.log('[mercio-runtime] Started, waiting for invocation jobs...')

process.on('SIGINT', async () => {
  console.log('[mercio-runtime] Shutting down...')
  await worker.close()
  process.exit(0)
})
