import { createWorker, createMercioWorker } from './src/worker'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const worker = createWorker()
const mercioWorker = createMercioWorker()

console.log('Worker started, waiting for jobs...')

process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await Promise.all([worker.close(), mercioWorker.close()])
  process.exit(0)
})
