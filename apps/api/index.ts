import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import auth from './src/routes/auth'
import deploy from './src/routes/deploy'
import appRouter from './src/routes/app'
import github from './src/routes/github'
import internal from './src/routes/internal'
import domains from './src/routes/domains'
import mercio from './src/routes/mercio'
import mercioInvoke from './src/routes/mercio-invoke'
import mercob from './src/routes/mercob'
import mercobRuns from './src/routes/mercob-runs'
import { subdomainMiddleware } from './src/middleware/subdomain'
import prisma from './src/lib/prisma'
import { logger } from './src/lib/logger'

if (!process.env['WORKER_SECRET']) throw new Error('WORKER_SECRET env var is required')

const app = express()

app.use(cors())
app.use(express.json())
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/health' },
}))

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

  const BASE_DOMAIN = process.env['BASE_DOMAIN']

  try {
    // Allow project subdomains (e.g., abc123.app.example.com)
    if (BASE_DOMAIN && domain.endsWith(`.${BASE_DOMAIN}`)) {
      const subdomain = domain.slice(0, -(`.${BASE_DOMAIN}`).length)
      if (subdomain && !subdomain.includes('.')) {
        const project = await prisma.project.findUnique({
          where: { subdomain },
          select: { status: true },
        })
        res.status(project?.status === 'DEPLOYED' ? 200 : 403).end()
        return
      }
    }

    // Allow verified custom domains
    const record = await prisma.customDomain.findFirst({
      where: { domain, verified: true },
    })
    res.status(record ? 200 : 403).end()
  } catch (error) {
    logger.error({ err: error, domain }, 'domain check failed')
    res.status(500).end()
  }
})

app.use('/auth', auth)
app.use('/deploy', deploy)
app.use('/deploy/:projectId/domains', domains)
app.use('/internal', internal)
app.use('/api/mercio', mercio)
app.use('/api/mercob/jobs', mercob)
app.use('/api/mercob/runs', mercobRuns)
app.use('/mercio', mercioInvoke)
app.use('/', github)

const port = process.env.PORT ?? 3001
app.listen(port, () => logger.info({ port }, 'API running'))
