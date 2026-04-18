import { createWorker } from './src/worker'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const worker = createWorker()

console.log('Worker started, waiting for jobs...')

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  process.exit(0)
})
