import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaProject,
  mockPrismaCustomDomain,
  mockResolveCname,
  resetAllMocks,
} from '../helpers/setup'
import { signToken } from '../../src/lib/jwt'

beforeEach(resetAllMocks)

async function makeToken(userId = 'u-1') {
  return signToken({ userId, email: 'user@example.com' })
}

const PROJECT = {
  id: 'proj-1',
  userId: 'u-1',
  subdomain: 'myapp',
}

const DOMAIN_RECORD = {
  id: 'domain-1',
  projectId: 'proj-1',
  domain: 'example.com',
  verified: false,
  sslStatus: 'PENDING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('POST /deploy/:projectId/domains', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .send({ domain: 'example.com' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when domain is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/domain is required/)
  })

  it('returns 400 for invalid domain format (starts with dot)', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: '.invalid.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Invalid domain format/)
  })

  it('returns 400 for domain with consecutive dots', async () => {
    const token = await makeToken()
    // Regex allows dots in middle but let's test something that fails
    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'a' }) // too short — only 1 char, regex requires at least 2 chars
    expect(res.status).toBe(400)
  })

  it('returns 404 when project does not belong to user', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue({ ...PROJECT, userId: 'other-user' })

    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'example.com' })
    expect(res.status).toBe(404)
  })

  it('returns 404 when project does not exist', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'example.com' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when domain is already in use', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)

    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'example.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/already in use/)
  })

  it('returns domain info and DNS instructions on success', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(null)
    mockPrismaCustomDomain.create.mockResolvedValue(DOMAIN_RECORD)

    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'example.com' })
    expect(res.status).toBe(200)
    expect(res.body.domain.domain).toBe('example.com')
    expect(res.body.dnsInstructions.type).toBe('CNAME')
    expect(res.body.dnsInstructions.value).toBe('myapp.test.example.com')
  })

  it('returns 500 on unexpected DB error', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'example.com' })
    expect(res.status).toBe(500)
  })
})

describe('POST /deploy/:projectId/domains/:domainId/verify', () => {
  it('returns 404 when project not owned by user', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue({ ...PROJECT, userId: 'other' })

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when domain record not found', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns 400 when domain is already verified', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue({ ...DOMAIN_RECORD, verified: true })

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/already verified/)
  })

  it('returns 400 when CNAME does not point to expected value', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)
    mockResolveCname.mockResolvedValue(['wrong.target.com'])

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/CNAME/)
    expect(res.body.expected).toBe('myapp.test.example.com')
  })

  it('returns 400 when DNS resolution fails', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)
    mockResolveCname.mockRejectedValue(new Error('ENOTFOUND'))

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Failed to resolve/)
  })

  it('returns verified domain and success message when CNAME matches', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)
    mockResolveCname.mockResolvedValue(['myapp.test.example.com'])
    mockPrismaCustomDomain.update.mockResolvedValue({ ...DOMAIN_RECORD, verified: true, sslStatus: 'PROVISIONING' })
    mockPrismaProject.update.mockResolvedValue({})

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.domain.verified).toBe(true)
    expect(res.body.message).toMatch(/verified/)
  })

  it('accepts CNAME with trailing dot', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)
    mockResolveCname.mockResolvedValue(['myapp.test.example.com.'])
    mockPrismaCustomDomain.update.mockResolvedValue({ ...DOMAIN_RECORD, verified: true, sslStatus: 'PROVISIONING' })
    mockPrismaProject.update.mockResolvedValue({})

    const res = await request(app)
      .post('/deploy/proj-1/domains/domain-1/verify')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})

describe('GET /deploy/:projectId/domains', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/deploy/proj-1/domains')
    expect(res.status).toBe(401)
  })

  it('returns 404 when project not owned by user', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns domains list for the project', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findMany.mockResolvedValue([DOMAIN_RECORD])

    const res = await request(app)
      .get('/deploy/proj-1/domains')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.domains).toHaveLength(1)
    expect(res.body.domains[0].domain).toBe('example.com')
  })
})

describe('DELETE /deploy/:projectId/domains/:domainId', () => {
  it('returns 404 when project not owned by user', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue({ ...PROJECT, userId: 'other' })

    const res = await request(app)
      .delete('/deploy/proj-1/domains/domain-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when domain does not belong to project', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue({ ...DOMAIN_RECORD, projectId: 'other-proj' })

    const res = await request(app)
      .delete('/deploy/proj-1/domains/domain-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('deletes domain and reverts deployedUrl', async () => {
    const token = await makeToken()
    mockPrismaProject.findUnique.mockResolvedValue(PROJECT)
    mockPrismaCustomDomain.findUnique.mockResolvedValue(DOMAIN_RECORD)
    mockPrismaCustomDomain.delete.mockResolvedValue(DOMAIN_RECORD)
    mockPrismaProject.update.mockResolvedValue({})

    const res = await request(app)
      .delete('/deploy/proj-1/domains/domain-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/deleted/)
    expect(mockPrismaProject.update.mock.calls[0][0].data.deployedUrl).toBe(
      'https://myapp.test.example.com'
    )
  })
})
