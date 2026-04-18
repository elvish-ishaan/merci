import { Router, Request, Response } from 'express'
import { promises as dns } from 'dns'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const domains = Router({ mergeParams: true })

const BASE_DOMAIN = process.env['BASE_DOMAIN'] ?? 'localhost'

interface AuthRequest extends Request {
  locals: { userId: string }
}

domains.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = res.locals['userId'] as string
  const projectId = req.params.projectId as string
  const { domain } = req.body as { domain?: string }

  if (!domain) {
    res.status(400).json({ error: 'domain is required' })
    return
  }

  // Validate domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/.test(domain)) {
    res.status(400).json({ error: 'Invalid domain format' })
    return
  }

  // Check project exists and belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true, subdomain: true },
  })

  if (!project || project.userId !== userId) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  // Check if domain already exists
  const existing = await prisma.customDomain.findUnique({
    where: { domain },
  })

  if (existing) {
    res.status(400).json({ error: 'Domain already in use' })
    return
  }

  const customDomain = await prisma.customDomain.create({
    data: {
      projectId,
      domain,
      verified: false,
      sslStatus: 'PENDING',
    },
  })

  res.json({
    domain: {
      id: customDomain.id,
      domain: customDomain.domain,
      verified: customDomain.verified,
      sslStatus: customDomain.sslStatus,
    },
    dnsInstructions: {
      type: 'CNAME',
      name: '@',
      value: `${project.subdomain}.${BASE_DOMAIN}`,
      note: 'After setting this record, click Verify. DNS propagation can take a few minutes.',
    },
  })
})

domains.post('/:domainId/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = res.locals['userId'] as string
  const projectId = req.params.projectId as string
  const domainId = req.params.domainId as string

  // Check project exists and belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true, subdomain: true },
  })

  if (!project || project.userId !== userId) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  // Check custom domain exists and belongs to project
  const customDomain = await prisma.customDomain.findUnique({
    where: { id: domainId },
    select: { id: true, projectId: true, domain: true, verified: true },
  })

  if (!customDomain || customDomain.projectId !== projectId) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }

  if (customDomain.verified) {
    res.status(400).json({ error: 'Domain already verified' })
    return
  }

  // Verify CNAME record
  try {
    const cnames = await dns.resolveCname(customDomain.domain)
    const expected = `${project.subdomain}.${BASE_DOMAIN}`

    const isValid = cnames.some((c) => {
      const normalized = c.endsWith('.') ? c.slice(0, -1) : c
      return normalized === expected
    })

    if (!isValid) {
      res.status(400).json({
        error: 'CNAME record not found or incorrect',
        expected,
        found: cnames,
      })
      return
    }
  } catch (error) {
    res.status(400).json({
      error: 'Failed to resolve domain. Please ensure the CNAME record is set correctly.',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
    return
  }

  // Update domain status
  const updated = await prisma.customDomain.update({
    where: { id: domainId },
    data: {
      verified: true,
      sslStatus: 'PROVISIONING',
    },
  })

  // Update project's deployedUrl if project is deployed
  if (project.id && project.subdomain) {
    await prisma.project.update({
      where: { id: projectId },
      data: { deployedUrl: `https://${customDomain.domain}` },
    })
  }

  res.json({
    domain: {
      id: updated.id,
      domain: updated.domain,
      verified: updated.verified,
      sslStatus: updated.sslStatus,
    },
    message: 'Domain verified successfully. SSL certificate will be provisioned shortly.',
  })
})

domains.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = res.locals['userId'] as string
  const projectId = req.params.projectId as string

  // Check project exists and belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  })

  if (!project || project.userId !== userId) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  const customDomains = await prisma.customDomain.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      domain: true,
      verified: true,
      sslStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  res.json({ domains: customDomains })
})

domains.delete('/:domainId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = res.locals['userId'] as string
  const projectId = req.params.projectId as string
  const domainId = req.params.domainId as string

  // Check project exists and belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true, subdomain: true },
  })

  if (!project || project.userId !== userId) {
    res.status(404).json({ error: 'Project not found' })
    return
  }

  // Check custom domain exists and belongs to project
  const customDomain = await prisma.customDomain.findUnique({
    where: { id: domainId },
    select: { id: true, projectId: true, domain: true },
  })

  if (!customDomain || customDomain.projectId !== projectId) {
    res.status(404).json({ error: 'Domain not found' })
    return
  }

  await prisma.customDomain.delete({
    where: { id: domainId },
  })

  // Revert deployedUrl to subdomain if it was pointing to the deleted domain
  await prisma.project.update({
    where: { id: projectId },
    data: {
      deployedUrl: `https://${project.subdomain}.${BASE_DOMAIN}`,
    },
  })

  res.json({ message: 'Domain deleted successfully' })
})

export default domains
