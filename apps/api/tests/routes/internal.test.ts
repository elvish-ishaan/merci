import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaBuildLog,
  mockPrismaJobRunLog,
  mockPrismaJobRun,
  mockRedisPubPublish,
  resetAllMocks,
} from '../helpers/setup'

beforeEach(resetAllMocks)

const WORKER_AUTH = `Bearer ${process.env['WORKER_SECRET']}`

describe('Worker auth guard (all /internal routes)', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/internal/logs').send({ projectId: 'p1', line: 'hi' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 401 when secret is wrong', async () => {
    const res = await request(app)
      .post('/internal/logs')
      .set('Authorization', 'Bearer wrong-secret')
      .send({ projectId: 'p1', line: 'hi' })
    expect(res.status).toBe(401)
  })
})

describe('POST /internal/logs', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await request(app)
      .post('/internal/logs')
      .set('Authorization', WORKER_AUTH)
      .send({ line: 'hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/projectId and line/)
  })

  it('returns 400 when line is missing', async () => {
    const res = await request(app)
      .post('/internal/logs')
      .set('Authorization', WORKER_AUTH)
      .send({ projectId: 'proj-1' })
    expect(res.status).toBe(400)
  })

  it('creates a BuildLog and publishes to Redis channel', async () => {
    const log = { id: 1, projectId: 'proj-1', line: 'Build started', stream: 'stdout' }
    mockPrismaBuildLog.create.mockResolvedValue(log)

    const res = await request(app)
      .post('/internal/logs')
      .set('Authorization', WORKER_AUTH)
      .send({ projectId: 'proj-1', line: 'Build started' })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(mockPrismaBuildLog.create.mock.calls.length).toBe(1)
    expect(mockPrismaBuildLog.create.mock.calls[0][0].data).toMatchObject({
      projectId: 'proj-1',
      line: 'Build started',
      stream: 'stdout',
    })
    const publishCall = mockRedisPubPublish.mock.calls[0]
    expect(publishCall[0]).toBe('build:proj-1')
    expect(JSON.parse(publishCall[1])).toMatchObject({ type: 'log', line: 'Build started' })
  })

  it('uses provided stream value', async () => {
    mockPrismaBuildLog.create.mockResolvedValue({ id: 2, projectId: 'p', line: 'err', stream: 'stderr' })

    await request(app)
      .post('/internal/logs')
      .set('Authorization', WORKER_AUTH)
      .send({ projectId: 'p', line: 'err', stream: 'stderr' })
    expect(mockPrismaBuildLog.create.mock.calls[0][0].data.stream).toBe('stderr')
  })
})

describe('POST /internal/status', () => {
  it('returns 400 when projectId is missing', async () => {
    const res = await request(app)
      .post('/internal/status')
      .set('Authorization', WORKER_AUTH)
      .send({ status: 'DEPLOYED' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when status is missing', async () => {
    const res = await request(app)
      .post('/internal/status')
      .set('Authorization', WORKER_AUTH)
      .send({ projectId: 'proj-1' })
    expect(res.status).toBe(400)
  })

  it('publishes status update to Redis build channel', async () => {
    const res = await request(app)
      .post('/internal/status')
      .set('Authorization', WORKER_AUTH)
      .send({ projectId: 'proj-1', status: 'DEPLOYED' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const publishCall = mockRedisPubPublish.mock.calls[0]
    expect(publishCall[0]).toBe('build:proj-1')
    expect(JSON.parse(publishCall[1])).toMatchObject({ type: 'status', status: 'DEPLOYED' })
  })
})

describe('POST /internal/job-logs', () => {
  it('returns 400 when runId is missing', async () => {
    const res = await request(app)
      .post('/internal/job-logs')
      .set('Authorization', WORKER_AUTH)
      .send({ line: 'hello' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/runId and line/)
  })

  it('returns 400 when line is missing', async () => {
    const res = await request(app)
      .post('/internal/job-logs')
      .set('Authorization', WORKER_AUTH)
      .send({ runId: 'run-1' })
    expect(res.status).toBe(400)
  })

  it('creates a JobRunLog record', async () => {
    mockPrismaJobRunLog.create.mockResolvedValue({ id: 1 })

    const res = await request(app)
      .post('/internal/job-logs')
      .set('Authorization', WORKER_AUTH)
      .send({ runId: 'run-1', line: 'Job running', stream: 'stdout' })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(mockPrismaJobRunLog.create.mock.calls[0][0].data).toMatchObject({
      runId: 'run-1',
      line: 'Job running',
      stream: 'stdout',
    })
  })

  it('defaults stream to stdout', async () => {
    mockPrismaJobRunLog.create.mockResolvedValue({ id: 1 })

    await request(app)
      .post('/internal/job-logs')
      .set('Authorization', WORKER_AUTH)
      .send({ runId: 'run-1', line: 'output' })
    expect(mockPrismaJobRunLog.create.mock.calls[0][0].data.stream).toBe('stdout')
  })
})

describe('PATCH /internal/job-runs/:runId', () => {
  it('returns 200 on success', async () => {
    mockPrismaJobRun.update.mockResolvedValue({ id: 'run-1' })

    const res = await request(app)
      .patch('/internal/job-runs/run-1')
      .set('Authorization', WORKER_AUTH)
      .send({ status: 'SUCCEEDED', httpStatus: 200, durationMs: 150 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('passes only provided fields to update', async () => {
    mockPrismaJobRun.update.mockResolvedValue({ id: 'run-1' })

    await request(app)
      .patch('/internal/job-runs/run-1')
      .set('Authorization', WORKER_AUTH)
      .send({ status: 'FAILED', errorMessage: 'timeout' })

    const updateData = mockPrismaJobRun.update.mock.calls[0][0].data
    expect(updateData.status).toBe('FAILED')
    expect(updateData.errorMessage).toBe('timeout')
    expect(updateData.httpStatus).toBeUndefined()
  })

  it('returns 404 when JobRun is not found', async () => {
    mockPrismaJobRun.update.mockRejectedValue(new Error('Record not found'))

    const res = await request(app)
      .patch('/internal/job-runs/run-nonexistent')
      .set('Authorization', WORKER_AUTH)
      .send({ status: 'SUCCEEDED' })
    expect(res.status).toBe(404)
  })

  it('converts startedAt and finishedAt strings to Date objects', async () => {
    mockPrismaJobRun.update.mockResolvedValue({ id: 'run-1' })

    await request(app)
      .patch('/internal/job-runs/run-1')
      .set('Authorization', WORKER_AUTH)
      .send({
        startedAt: '2024-01-01T10:00:00.000Z',
        finishedAt: '2024-01-01T10:00:01.000Z',
      })

    const updateData = mockPrismaJobRun.update.mock.calls[0][0].data
    expect(updateData.startedAt).toBeInstanceOf(Date)
    expect(updateData.finishedAt).toBeInstanceOf(Date)
  })
})
