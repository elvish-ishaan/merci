import { createWorker } from './src/worker'

const worker = createWorker()

console.log('Worker started, waiting for jobs...')

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  process.exit(0)
})
