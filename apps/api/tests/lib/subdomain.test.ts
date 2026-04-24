import { describe, it, expect, beforeEach } from 'bun:test'
import {
  mockPrismaProject,
  mockNanoidFn,
  resetAllMocks,
} from '../helpers/setup'
import { generateUniqueSubdomain } from '../../src/lib/subdomain'

beforeEach(resetAllMocks)

describe('generateUniqueSubdomain', () => {
  it('returns a valid subdomain string when DB has no collision', async () => {
    mockNanoidFn.mockReturnValue('xyz123')
    mockPrismaProject.findUnique.mockResolvedValue(null)

    const result = await generateUniqueSubdomain()
    expect(result).toBe('xyz123')
  })

  it('retries when first generated id is already taken', async () => {
    mockNanoidFn
      .mockReturnValueOnce('taken1')
      .mockReturnValueOnce('free22')

    mockPrismaProject.findUnique
      .mockResolvedValueOnce({ id: 'existing-project' })
      .mockResolvedValueOnce(null)

    const result = await generateUniqueSubdomain()
    expect(result).toBe('free22')
    expect(mockPrismaProject.findUnique.mock.calls.length).toBe(2)
  })

  it('skips reserved words and retries', async () => {
    mockNanoidFn
      .mockReturnValueOnce('auth')
      .mockReturnValueOnce('deploy')
      .mockReturnValueOnce('hello1')

    mockPrismaProject.findUnique.mockResolvedValue(null)

    const result = await generateUniqueSubdomain()
    expect(result).toBe('hello1')
    // should not have checked 'auth' or 'deploy' in DB
    expect(mockPrismaProject.findUnique.mock.calls[0][0]).toEqual({
      where: { subdomain: 'hello1' },
      select: { id: true },
    })
  })

  it('throws if DB throws during uniqueness check', async () => {
    mockNanoidFn.mockReturnValue('normal1')
    mockPrismaProject.findUnique.mockRejectedValue(new Error('DB connection failed'))

    await expect(generateUniqueSubdomain()).rejects.toThrow('Database error')
  })

  it('uses 7-char fallback after 10 collisions', async () => {
    // All 10 retries return collisions, then 7-char fallback succeeds
    mockNanoidFn
      .mockReturnValue('collide')

    mockPrismaProject.findUnique
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ id: '2' })
      .mockResolvedValueOnce({ id: '3' })
      .mockResolvedValueOnce({ id: '4' })
      .mockResolvedValueOnce({ id: '5' })
      .mockResolvedValueOnce({ id: '6' })
      .mockResolvedValueOnce({ id: '7' })
      .mockResolvedValueOnce({ id: '8' })
      .mockResolvedValueOnce({ id: '9' })
      .mockResolvedValueOnce({ id: '10' })
      .mockResolvedValueOnce(null) // 7-char attempt

    const result = await generateUniqueSubdomain()
    expect(result).toBe('collide') // mock returns same value for 7-char too
  })
})
