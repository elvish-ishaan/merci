import { describe, it, expect } from 'bun:test'
import { signToken, verifyToken } from '../../src/lib/jwt'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env['JWT_SECRET']!)

describe('signToken', () => {
  it('returns a non-empty string', async () => {
    const token = await signToken({ userId: 'u1', email: 'a@b.com' })
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('produces a JWT with three dot-separated segments', async () => {
    const token = await signToken({ userId: 'u1', email: 'a@b.com' })
    expect(token.split('.').length).toBe(3)
  })
})

describe('verifyToken', () => {
  it('returns the original payload for a valid token', async () => {
    const token = await signToken({ userId: 'user-123', email: 'test@example.com' })
    const payload = await verifyToken(token)
    expect(payload.userId).toBe('user-123')
    expect(payload.email).toBe('test@example.com')
  })

  it('throws on a completely invalid string', async () => {
    await expect(verifyToken('not.a.token')).rejects.toThrow()
  })

  it('throws on a tampered token', async () => {
    const token = await signToken({ userId: 'u1', email: 'a@b.com' })
    const tampered = token.slice(0, -4) + 'XXXX'
    await expect(verifyToken(tampered)).rejects.toThrow()
  })

  it('throws on an expired token', async () => {
    const expiredToken = await new SignJWT({ userId: 'u1', email: 'a@b.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(new Date(Date.now() - 1000 * 60 * 60 * 24 * 10))
      .setExpirationTime(new Date(Date.now() - 1000 * 60 * 60 * 24 * 3))
      .sign(secret)

    await expect(verifyToken(expiredToken)).rejects.toThrow()
  })

  it('throws when signed with a different secret', async () => {
    const wrongSecret = new TextEncoder().encode('completely-different-secret-value!')
    const otherToken = await new SignJWT({ userId: 'u1', email: 'a@b.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(wrongSecret)

    await expect(verifyToken(otherToken)).rejects.toThrow()
  })
})
