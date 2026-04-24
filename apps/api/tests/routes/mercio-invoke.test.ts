import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaMercioFunction,
  mockQueueAdd,
  mockJobWaitUntilFinished,
  resetAllMocks,
} from '../helpers/setup'

beforeEach(resetAllMocks)

const DEPLOYED_FN = { status: 'DEPLOYED' }
const QUEUED_FN = { status: 'QUEUED' }

describe('POST /mercio/:id (handleInvoke)', () => {
  it('returns 404 when function does not exist', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(null)

    const res = await request(app).post('/mercio/fn-1').send({})
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Function not found')
  })

  it('returns 409 when function is not deployed', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(QUEUED_FN)

    const res = await request(app).post('/mercio/fn-1').send({})
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/not deployed/)
  })

  it('returns 504 when job execution times out', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockRejectedValue(new Error('Job timed out'))

    const res = await request(app).post('/mercio/fn-1').send({})
    expect(res.status).toBe(504)
    expect(res.body.error).toMatch(/timed out/)
  })

  it('returns 500 when job execution fails with non-timeout error', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockRejectedValue(new Error('Worker crashed'))

    const res = await request(app).post('/mercio/fn-1').send({})
    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/execution failed/)
  })

  it('returns status, headers, and body from job result', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockResolvedValue({
      status: 201,
      headers: { 'x-custom': 'value', 'content-type': 'application/json' },
      body: '{"ok":true}',
    })

    const res = await request(app).post('/mercio/fn-1').send({ input: 'data' })
    expect(res.status).toBe(201)
    expect(res.headers['x-custom']).toBe('value')
    expect(res.text).toBe('{"ok":true}')
  })

  it('queues job with correct invocation payload', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockResolvedValue({ status: 200, headers: {}, body: 'ok' })

    await request(app)
      .post('/mercio/fn-1')
      .set('x-custom-header', 'test-value')
      .send({ hello: 'world' })

    const jobPayload = mockQueueAdd.mock.calls[0][1]
    expect(jobPayload.id).toBe('fn-1')
    expect(jobPayload.method).toBe('POST')
    expect(jobPayload.path).toBe('/')
    expect(jobPayload.headers['x-custom-header']).toBe('test-value')
    expect(jobPayload.headers['host']).toBeUndefined()
  })

  it('does not include body for GET requests', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockResolvedValue({ status: 200, headers: {}, body: 'ok' })

    await request(app).get('/mercio/fn-1')

    const jobPayload = mockQueueAdd.mock.calls[0][1]
    expect(jobPayload.method).toBe('GET')
    expect(jobPayload.body).toBeNull()
  })

  it('uses default status 200 when job result has no status', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockResolvedValue({ headers: {}, body: 'hello' })

    const res = await request(app).post('/mercio/fn-1').send({})
    expect(res.status).toBe(200)
  })
})

describe('GET /mercio/:id/* (path routing)', () => {
  it('passes the subpath in the job payload', async () => {
    mockPrismaMercioFunction.findUnique.mockResolvedValue(DEPLOYED_FN)
    mockJobWaitUntilFinished.mockResolvedValue({ status: 200, headers: {}, body: 'data' })

    await request(app).get('/mercio/fn-1/api/users?page=2')

    const jobPayload = mockQueueAdd.mock.calls[0][1]
    expect(jobPayload.path).toBe('/api/users')
    expect(jobPayload.query).toMatchObject({ page: '2' })
  })
})
