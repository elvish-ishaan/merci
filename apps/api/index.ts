import express from 'express'
import cors from 'cors'
import auth from './src/routes/auth'
import deploy from './src/routes/deploy'
import appRouter from './src/routes/app'
import github from './src/routes/github'
import internal from './src/routes/internal'
import domains from './src/routes/domains'
import { subdomainMiddleware } from './src/middleware/subdomain'
import prisma from './src/lib/prisma'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const app = express()

app.use(cors())
app.use(express.json())

app.use(subdomainMiddleware)

app.use((req, res, next) => {
  if ((req as any).subdomainProjectId) return appRouter(req, res, next)
  next()
})

app.get('/health', (_req, res) => res.json({ ok: true }))

// Caddy on_demand_tls callback - must be before auth middleware
app.get('/internal/domain-check', async (req, res) => {
  const domain = req.query['domain'] as string
  if (!domain) return res.status(400).end()
  const record = await prisma.customDomain.findUnique({
    where: { domain, verified: true },
  })
  res.status(record ? 200 : 403).end()
})

app.use('/auth', auth)
app.use('/deploy', deploy)
app.use('/deploy/:projectId/domains', domains)
app.use('/internal', internal)
app.use('/', github)

const port = process.env.PORT ?? 3001
app.listen(port, () => console.log(`API running on http://localhost:${port}`))
