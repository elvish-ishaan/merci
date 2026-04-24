import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaMercioFunction,
  mockQueueAdd,
  mockR2Send,
  resetAllMocks,
} from '../helpers/setup'
import { signToken } from '../../src/lib/jwt'

beforeEach(resetAllMocks)

async function makeToken(userId = 'u-1') {
  return signToken({ userId, email: 'user@example.com' })
}

const FN = {
  id: 'fn-1',
  userId: 'u-1',
  name: 'my-function',
  entry: 'index.js',
  status: 'QUEUED',
  errorMessage: null,
  bundleKey: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('POST /api/mercio/upload', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/mercio/upload')
      .attach('zip', Buffer.from('PK'), { filename: 'fn.zip', contentType: 'application/zip' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/api/mercio/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('zip', Buffer.from('PK'), { filename: 'fn.zip', contentType: 'application/zip' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name is required/)
  })

  it('returns 400 when no zip file is attached', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/api/mercio/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'my-function' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/zip file is required/)
  })

  it('returns 201 with function info on success', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.create.mockResolvedValue(FN)

    const res = await request(app)
      .post('/api/mercio/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'my-function')
      .attach('zip', Buffer.from('PK\x03\x04'), { filename: 'fn.zip', contentType: 'application/zip' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('fn-1')
    expect(res.body.name).toBe('my-function')
    expect(res.body.invokeUrl).toContain('/mercio/fn-1')
    expect(mockR2Send.mock.calls.length).toBe(1)
    expect(mockQueueAdd.mock.calls.length).toBe(1)
    expect(mockQueueAdd.mock.calls[0][1]).toMatchObject({ functionId: 'fn-1' })
  })

  it('defaults entry to index.js when not provided', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.create.mockResolvedValue(FN)

    await request(app)
      .post('/api/mercio/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'my-function')
      .attach('zip', Buffer.from('PK'), { filename: 'fn.zip', contentType: 'application/zip' })

    expect(mockPrismaMercioFunction.create.mock.calls[0][0].data.entry).toBe('index.js')
  })

})

describe('GET /api/mercio', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/mercio')
    expect(res.status).toBe(401)
  })

  it("returns user's function list", async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findMany.mockResolvedValue([FN])

    const res = await request(app)
      .get('/api/mercio')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.functions).toHaveLength(1)
    expect(res.body.functions[0].id).toBe('fn-1')
  })

  it('returns empty array when user has no functions', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/api/mercio')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.functions).toEqual([])
  })
})

describe('GET /api/mercio/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/mercio/fn-1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when function does not belong to user', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/mercio/fn-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns function details with invokeUrl', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)

    const res = await request(app)
      .get('/api/mercio/fn-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.function.id).toBe('fn-1')
    expect(res.body.invokeUrl).toContain('/mercio/fn-1')
  })
})

describe('DELETE /api/mercio/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/mercio/fn-1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when function not found', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete('/api/mercio/fn-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('deletes R2 objects and DB record', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)
    // First send() = ListObjectsV2, second = DeleteObject
    mockR2Send
      .mockResolvedValueOnce({ Contents: [{ Key: 'mercio/fn-1/source.zip' }, { Key: 'mercio/fn-1/bundle.js' }] })
      .mockResolvedValue({})
    mockPrismaMercioFunction.delete.mockResolvedValue(FN)

    const res = await request(app)
      .delete('/api/mercio/fn-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // list + 2 deletes
    expect(mockR2Send.mock.calls.length).toBe(3)
    expect(mockPrismaMercioFunction.delete.mock.calls.length).toBe(1)
  })

  it('handles empty R2 prefix gracefully', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)
    mockR2Send.mockResolvedValueOnce({ Contents: undefined })
    mockPrismaMercioFunction.delete.mockResolvedValue(FN)

    const res = await request(app)
      .delete('/api/mercio/fn-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(mockR2Send.mock.calls.length).toBe(1) // only list, no deletes
  })
})
