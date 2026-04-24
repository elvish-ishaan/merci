import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import { mockPrismaUser, mockFetch, resetAllMocks } from '../helpers/setup'
import { signToken } from '../../src/lib/jwt'

beforeEach(resetAllMocks)

async function makeToken(userId = 'u-1', email = 'user@example.com') {
  return signToken({ userId, email })
}

describe('GET /auth/github', () => {
  it('returns 400 when token query param is missing', async () => {
    const res = await request(app).get('/auth/github')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Missing token')
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app).get('/auth/github?token=badtoken')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid token')
  })

  it('redirects to GitHub OAuth URL for a valid token', async () => {
    const token = await makeToken()
    const res = await request(app).get(`/auth/github?token=${token}`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github.com/login/oauth/authorize')
    expect(res.headers.location).toContain('test-gh-client-id')
  })
})

describe('GET /auth/github/callback', () => {
  it('redirects to error page when code is missing', async () => {
    const res = await request(app).get('/auth/github/callback?state=xxx')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github=error')
  })

  it('redirects to error page when state is missing', async () => {
    const res = await request(app).get('/auth/github/callback?code=abc')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github=error')
  })

  it('redirects to error page when state JWT is invalid', async () => {
    const res = await request(app).get('/auth/github/callback?code=abc&state=invalid')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github=error')
  })

  it('redirects to error when GitHub access_token exchange fails', async () => {
    const state = await makeToken()
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: 'bad_verification_code' }),
    })

    const res = await request(app).get(`/auth/github/callback?code=abc&state=${state}`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github=error')
  })

  it('redirects to connected page on success', async () => {
    const state = await makeToken('u-1')
    mockFetch
      .mockResolvedValueOnce({ json: async () => ({ access_token: 'gh_token_123' }) })
      .mockResolvedValueOnce({ json: async () => ({ id: 42 }) })
    mockPrismaUser.update.mockResolvedValue({ id: 'u-1' })

    const res = await request(app).get(`/auth/github/callback?code=abc&state=${state}`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('github=connected')
    expect(mockPrismaUser.update.mock.calls.length).toBe(1)
  })
})

describe('GET /github/status', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/github/status')
    expect(res.status).toBe(401)
  })

  it('returns connected: false when user has no GitHub token', async () => {
    const token = await makeToken()
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: null })

    const res = await request(app)
      .get('/github/status')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(false)
  })

  it('returns connected: true when user has GitHub token', async () => {
    const token = await makeToken()
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: 'enc:some-token' })

    const res = await request(app)
      .get('/github/status')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(true)
  })
})

describe('GET /github/repos', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/github/repos')
    expect(res.status).toBe(401)
  })

  it('returns 400 when GitHub is not connected', async () => {
    const token = await makeToken()
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: null })

    const res = await request(app)
      .get('/github/repos')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/not connected/)
  })

  it('returns 502 when GitHub API call fails', async () => {
    const token = await makeToken()
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: 'enc:gh-token' })
    mockFetch.mockResolvedValueOnce({ ok: false })

    const res = await request(app)
      .get('/github/repos')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(502)
  })

  it('returns mapped repos on success', async () => {
    const token = await makeToken()
    mockPrismaUser.findUnique.mockResolvedValue({ githubAccessToken: 'enc:gh-token' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          full_name: 'user/repo',
          private: false,
          description: 'A repo',
          clone_url: 'https://github.com/user/repo.git',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    })

    const res = await request(app)
      .get('/github/repos')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.repos).toHaveLength(1)
    expect(res.body.repos[0].fullName).toBe('user/repo')
    expect(res.body.repos[0].cloneUrl).toBe('https://github.com/user/repo.git')
  })
})
