import type { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { logger } from '../lib/logger'

const BASE_DOMAIN = process.env['BASE_DOMAIN']

export async function subdomainMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const host = req.hostname
  const suffix = `.${BASE_DOMAIN}`

  // Check subdomain routing
  if (host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    if (!subdomain || subdomain.includes('.')) {
      res.status(400).json({ error: 'Invalid subdomain' })
      return
    }

    try {
      const project = await prisma.project.findUnique({
        where: { subdomain },
        select: { id: true, status: true },
      })

      if (!project) {
        res.status(404).json({ error: 'App not found' })
        return
      }

      if (project.status !== 'DEPLOYED') {
        res.status(503).json({ error: 'App not deployed yet' })
        return
      }

      ;(req as any).subdomainProjectId = project.id
      return next()
    } catch (error) {
      logger.error({ err: error, subdomain }, 'failed to resolve subdomain')
      res.status(500).json({ error: 'Internal server error' })
      return
    }
  }

  // Check custom domain routing
  try {
    const customDomain = await prisma.customDomain.findFirst({
      where: { domain: host, verified: true },
      include: { project: { select: { id: true, status: true } } },
    })

    if (customDomain) {
      if (customDomain.project.status !== 'DEPLOYED') {
        res.status(503).json({ error: 'App not deployed yet' })
        return
      }

      // Update sslStatus to ACTIVE on first successful request
      if (customDomain.sslStatus === 'PROVISIONING') {
        prisma.customDomain
          .update({
            where: { id: customDomain.id },
            data: { sslStatus: 'ACTIVE' },
          })
          .catch((error) => logger.error({ err: error, domainId: customDomain.id }, 'failed to update SSL status'))
      }

      ;(req as any).subdomainProjectId = customDomain.project.id
      return next()
    }
  } catch (error) {
    logger.error({ err: error, host }, 'failed to resolve custom domain')
    res.status(500).json({ error: 'Internal server error' })
    return
  }

  next()
}
