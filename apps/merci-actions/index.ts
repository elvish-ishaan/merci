import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { logger } from './src/lib/logger'
import webhook from './src/routes/webhook'
import repos from './src/routes/repos'
import runs from './src/routes/runs'
import internal from './src/routes/internal'

if (!process.env['JWT_SECRET']) throw new Error('JWT_SECRET env var is required')
if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const isDev = process.env['NODE_ENV'] !== 'production'

const app = express()

app.use(cors({ origin: '*' }))
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/health' },
    customSuccessMessage: (req, res, responseTime) => {
      const base = `${req.method} ${req.url} ${res.statusCode}`
      return isDev ? `${base} +${responseTime}ms` : base
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
)

// Raw body required for HMAC signature verification on webhook routes
app.use('/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/webhook', webhook)
app.use('/api/repos', repos)
app.use('/api/runs', runs)
app.use('/internal', internal)

const port = process.env['PORT'] ?? 3003
app.listen(port, () => logger.info({ port }, 'merci-actions running'))
