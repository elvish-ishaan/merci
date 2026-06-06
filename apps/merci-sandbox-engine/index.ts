import express, { type Request, type Response, type NextFunction } from 'express'
import executeRouter from './src/execute'
import { logger } from './src/lib/logger'

const SANDBOX_ENGINE_SECRET = process.env['SANDBOX_ENGINE_SECRET']
if (!SANDBOX_ENGINE_SECRET) throw new Error('SANDBOX_ENGINE_SECRET env var is required')

const app = express()

app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

// Bearer token auth for all /execute routes
app.use('/execute', (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (header.slice(7) !== SANDBOX_ENGINE_SECRET) {
    res.status(401).json({ error: 'Invalid secret' })
    return
  }
  next()
})

app.use('/execute', executeRouter)

const port = Number(process.env['PORT'] ?? 3003)
app.listen(port, () => logger.info({ port }, 'sandbox-engine running'))
