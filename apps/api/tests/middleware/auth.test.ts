import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import express from 'express'
import { resetAllMocks } from '../helpers/setup'
import { authMiddleware } from '../../src/middleware/auth'
import { signToken } from '../../src/lib/jwt'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env['JWT_SECRET']!)

// Minimal app just for testing the middleware
const app = express()
app.use(express.json())
app.get('/protected', authMiddleware, (_req, res) => {
  res.json({ userId: res.locals['userId'], email: res.locals['email'] })
})

beforeEach(resetAllMocks)

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 401 when Bearer token is empty', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer ')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is not a valid JWT', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.jwt')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid or expired token')
  })

  it('returns 401 when token is signed with wrong secret', async () => {
    const wrongSecret = new TextEncoder().encode('completely-wrong-secret-value!!!!')
    const token = await new SignJWT({ userId: 'u1', email: 'a@b.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(wrongSecret)

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is expired', async () => {
    const expired = await new SignJWT({ userId: 'u1', email: 'a@b.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(new Date(Date.now() - 1000 * 60 * 60 * 24 * 10))
      .setExpirationTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 5))
      .sign(secret)

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`)
    expect(res.status).toBe(401)
  })

  it('calls next and sets res.locals for a valid token', async () => {
    const token = await signToken({ userId: 'user-999', email: 'valid@example.com' })

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('user-999')
    expect(res.body.email).toBe('valid@example.com')
  })
})
