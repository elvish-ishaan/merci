import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaProject,
  mockPrismaUser,
  mockQueueAdd,
  mockNanoidFn,
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
  projectName: 'my-repo',
  repoUrl: 'https://github.com/user/my-repo',
  status: 'QUEUED',
  bucketPrefix: null,
  deployedUrl: null,
  subdomain: 'abcdef',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('GET /deploy', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/deploy')
    expect(res.status).toBe(401)
  })

  it('returns empty projects array when user has none', async () => {
    const token = await makeToken()
    mockPrismaProject.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/deploy')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.projects).toEqual([])
  })

  it("returns the user's projects ordered by createdAt", async () => {
    const token = await makeToken()
    mockPrismaProject.findMany.mockResolvedValue([PROJECT])

    const res = await request(app)
      .get('/deploy')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.projects).toHaveLength(1)
    expect(res.body.projects[0].id).toBe('proj-1')
  })
})

describe('POST /deploy', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/deploy').send({ repoUrl: 'https://github.com/u/r' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when repoUrl is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({ projectName: 'test' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/repoUrl is required/)
  })

  it('returns 400 when more than 50 env vars are provided', async () => {
    const token = await makeToken()
    const envVars = Array.from({ length: 51 }, (_, i) => ({ key: `KEY_${i}`, value: 'val' }))

    const res = await request(app)
      .post('/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://github.com/u/r', envVars })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Maximum 50/)
  })

  it('creates project, queues job, and returns project info', async () => {
    const token = await makeToken()
    mockNanoidFn.mockReturnValue('abcdef')
    mockPrismaProject.findUnique.mockResolvedValue(null) // subdomain available

    // $transaction mock (from setup) returns the created project
    mockPrismaProject.create.mockResolvedValue(PROJECT)
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: null })

    const res = await request(app)
      .post('/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://github.com/user/my-repo', projectName: 'my-repo' })
    expect(res.status).toBe(200)
    expect(res.body.projectId).toBe(PROJECT.id)
    expect(res.body.status).toBe('QUEUED')
    expect(mockQueueAdd.mock.calls.length).toBe(1)
    expect(mockQueueAdd.mock.calls[0][0]).toBe('deploy')
    expect(mockQueueAdd.mock.calls[0][1]).toMatchObject({ projectId: PROJECT.id })
  })

  it('passes decrypted GitHub token to the queue job', async () => {
    const token = await makeToken()
    mockNanoidFn.mockReturnValue('abcdef')
    mockPrismaProject.findUnique.mockResolvedValue(null)
    mockPrismaProject.create.mockResolvedValue(PROJECT)
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: 'enc:gh_secret' })

    await request(app)
      .post('/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://github.com/user/my-repo' })

    expect(mockQueueAdd.mock.calls[0][1].githubToken).toBe('gh_secret')
  })

  it('filters out env vars with empty keys', async () => {
    const token = await makeToken()
    mockNanoidFn.mockReturnValue('abcdef')
    mockPrismaProject.findUnique.mockResolvedValue(null)
    mockPrismaProject.create.mockResolvedValue(PROJECT)
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: null })

    const res = await request(app)
      .post('/deploy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        repoUrl: 'https://github.com/u/r',
        envVars: [
          { key: 'VALID_KEY', value: 'val' },
          { key: '', value: 'ignored' },
          { key: '  ', value: 'also ignored' },
        ],
      })
    expect(res.status).toBe(200)
  })
})
