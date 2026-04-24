import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaUser,
  mockBcryptHash,
  mockBcryptCompare,
  resetAllMocks,
} from '../helpers/setup'

const USER = { id: 'u-1', email: 'test@example.com', password: 'hashed-password' }

beforeEach(resetAllMocks)

describe('POST /auth/register', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'password123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email and password/)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email and password/)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@b.com', password: 'short' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least 8 characters/)
  })

  it('returns 409 when email is already registered', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(USER)

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already registered/)
  })

  it('returns 201 with token and userId on success', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)
    mockPrismaUser.create.mockResolvedValue(USER)

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.userId).toBe(USER.id)
    expect(mockBcryptHash.mock.calls[0][0]).toBe('password123')
  })

})

describe('POST /auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email and password/)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
  })

  it('returns 401 when user is not found', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid credentials/)
  })

  it('returns 401 when password does not match', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(USER)
    mockBcryptCompare.mockResolvedValue(false)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: USER.email, password: 'wrongpassword' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid credentials/)
  })

  it('returns 200 with token and userId on success', async () => {
    mockPrismaUser.findUnique.mockResolvedValue(USER)
    mockBcryptCompare.mockResolvedValue(true)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: USER.email, password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.userId).toBe(USER.id)
  })

})
