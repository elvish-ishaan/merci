import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import {
  mockPrismaScheduledJob,
  mockPrismaMercioFunction,
  mockPrismaJobRun,
  mockQueueAdd,
  resetAllMocks,
} from '../helpers/setup'
import { signToken } from '../../src/lib/jwt'
import { computeNextRunAt } from '../../src/routes/mercob'

beforeEach(resetAllMocks)

async function makeToken(userId = 'u-1') {
  return signToken({ userId, email: 'user@example.com' })
}

const FN = { id: 'fn-1', userId: 'u-1', name: 'fn', status: 'DEPLOYED' }

const JOB = {
  id: 'job-1',
  userId: 'u-1',
  functionId: 'fn-1',
  name: 'My Job',
  active: true,
  recurring: true,
  scheduleKind: 'INTERVAL',
  intervalSec: 60,
  timeOfDay: null,
  daysOfWeek: [],
  cronExpr: null,
  runAt: null,
  method: 'GET',
  path: '/',
  query: {},
  headers: {},
  body: null,
  maxRetries: 0,
  timeoutMs: 30000,
  nextRunAt: new Date().toISOString(),
  lastRunAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ── computeNextRunAt unit tests ──────────────────────────────────────────────

describe('computeNextRunAt', () => {
  const from = new Date('2024-06-15T12:00:00.000Z') // Saturday

  it('INTERVAL: adds intervalSec to from date', () => {
    const result = computeNextRunAt({ scheduleKind: 'INTERVAL', intervalSec: 300, daysOfWeek: [] }, from)
    expect(result).not.toBeNull()
    expect(result!.getTime()).toBe(from.getTime() + 300_000)
  })

  it('INTERVAL: returns null when intervalSec is missing', () => {
    const result = computeNextRunAt({ scheduleKind: 'INTERVAL', intervalSec: null, daysOfWeek: [] }, from)
    expect(result).toBeNull()
  })

  it('DAILY: returns next occurrence of timeOfDay in UTC', () => {
    // from is 12:00 UTC; next 09:00 is the following day
    const result = computeNextRunAt({ scheduleKind: 'DAILY', timeOfDay: '09:00', daysOfWeek: [] }, from)
    expect(result).not.toBeNull()
    expect(result!.getUTCHours()).toBe(9)
    expect(result!.getUTCDate()).toBe(16) // next day
  })

  it('DAILY: returns same-day occurrence when timeOfDay is still in the future', () => {
    // from is 12:00 UTC; next 15:00 is same day
    const result = computeNextRunAt({ scheduleKind: 'DAILY', timeOfDay: '15:00', daysOfWeek: [] }, from)
    expect(result).not.toBeNull()
    expect(result!.getUTCDate()).toBe(15) // same day
    expect(result!.getUTCHours()).toBe(15)
  })

  it('WEEKLY: returns next matching day of week', () => {
    // from is Saturday (day 6); next Monday (day 1)
    const result = computeNextRunAt({ scheduleKind: 'WEEKLY', timeOfDay: '10:00', daysOfWeek: [1], intervalSec: null }, from)
    expect(result).not.toBeNull()
    expect(result!.getUTCDay()).toBe(1) // Monday
    expect(result!.getUTCHours()).toBe(10)
  })

  it('WEEKLY: defaults to Sunday when daysOfWeek is empty', () => {
    const result = computeNextRunAt({ scheduleKind: 'WEEKLY', timeOfDay: '00:00', daysOfWeek: [], intervalSec: null }, from)
    expect(result).not.toBeNull()
    expect(result!.getUTCDay()).toBe(0) // Sunday
  })

  it('CRON: returns from + 60 seconds placeholder', () => {
    const result = computeNextRunAt({ scheduleKind: 'CRON', cronExpr: '* * * * *', daysOfWeek: [] }, from)
    expect(result).not.toBeNull()
    expect(result!.getTime()).toBe(from.getTime() + 60_000)
  })

  it('CRON: returns null when cronExpr is missing', () => {
    const result = computeNextRunAt({ scheduleKind: 'CRON', cronExpr: null, daysOfWeek: [] }, from)
    expect(result).toBeNull()
  })

  it('ONCE: returns the runAt date', () => {
    const runAt = new Date('2025-01-01T00:00:00Z')
    const result = computeNextRunAt({ scheduleKind: 'ONCE', runAt, daysOfWeek: [] }, from)
    expect(result).toEqual(runAt)
  })

  it('ONCE: returns null when runAt is missing', () => {
    const result = computeNextRunAt({ scheduleKind: 'ONCE', runAt: null, daysOfWeek: [] }, from)
    expect(result).toBeNull()
  })
})

// ── Route tests ───────────────────────────────────────────────────────────────

describe('POST /api/mercob/jobs', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/mercob/jobs').send({})
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ functionId: 'fn-1', scheduleKind: 'INTERVAL', intervalSec: 60 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name is required/)
  })

  it('returns 400 when functionId is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'job', scheduleKind: 'INTERVAL', intervalSec: 60 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/functionId is required/)
  })

  it('returns 400 when scheduleKind is missing', async () => {
    const token = await makeToken()
    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'job', functionId: 'fn-1' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/scheduleKind is required/)
  })

  it('returns 404 when function does not belong to user', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'job', functionId: 'fn-other', scheduleKind: 'INTERVAL', intervalSec: 60 })
    expect(res.status).toBe(404)
  })

  it('returns 400 when schedule cannot be computed (INTERVAL without intervalSec)', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)

    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'job', functionId: 'fn-1', scheduleKind: 'INTERVAL' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Cannot compute nextRunAt/)
  })

  it('returns 201 on successful INTERVAL job creation', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)
    mockPrismaScheduledJob.create.mockResolvedValue(JOB)

    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Job', functionId: 'fn-1', scheduleKind: 'INTERVAL', intervalSec: 60 })
    expect(res.status).toBe(201)
    expect(res.body.job.id).toBe('job-1')
  })

  it('returns 201 on successful DAILY job creation', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)
    mockPrismaScheduledJob.create.mockResolvedValue({ ...JOB, scheduleKind: 'DAILY' })

    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Daily Job', functionId: 'fn-1', scheduleKind: 'DAILY', timeOfDay: '09:00' })
    expect(res.status).toBe(201)
  })

  it('returns 201 on successful ONCE job creation', async () => {
    const token = await makeToken()
    mockPrismaMercioFunction.findFirst.mockResolvedValue(FN)
    mockPrismaScheduledJob.create.mockResolvedValue({ ...JOB, scheduleKind: 'ONCE' })

    const res = await request(app)
      .post('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'One-off', functionId: 'fn-1', scheduleKind: 'ONCE', runAt: '2030-01-01T00:00:00Z' })
    expect(res.status).toBe(201)
  })
})

describe('GET /api/mercob/jobs', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/mercob/jobs')
    expect(res.status).toBe(401)
  })

  it("returns user's job list", async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findMany.mockResolvedValue([JOB])

    const res = await request(app)
      .get('/api/mercob/jobs')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.jobs).toHaveLength(1)
  })
})

describe('GET /api/mercob/jobs/:id', () => {
  it('returns 404 when job not found', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns job details', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)

    const res = await request(app)
      .get('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.job.id).toBe('job-1')
  })
})

describe('PATCH /api/mercob/jobs/:id', () => {
  it('returns 404 when job not found', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .patch('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(404)
  })

  it('updates and returns the job', async () => {
    const token = await makeToken()
    const updated = { ...JOB, name: 'Updated Job' }
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaScheduledJob.update.mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Job' })
    expect(res.status).toBe(200)
    expect(res.body.job.name).toBe('Updated Job')
  })
})

describe('DELETE /api/mercob/jobs/:id', () => {
  it('returns 404 when job not found', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('deletes the job and returns ok', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaScheduledJob.delete.mockResolvedValue(JOB)

    const res = await request(app)
      .delete('/api/mercob/jobs/job-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('POST /api/mercob/jobs/:id/trigger', () => {
  it('returns 404 when job not found', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/mercob/jobs/job-1/trigger')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('creates a JobRun, queues invocation, and returns runId', async () => {
    const token = await makeToken()
    const run = { id: 'run-1' }
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaJobRun.create.mockResolvedValue(run)

    const res = await request(app)
      .post('/api/mercob/jobs/job-1/trigger')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(202)
    expect(res.body.runId).toBe('run-1')
    expect(mockQueueAdd.mock.calls.length).toBe(1)
    expect(mockQueueAdd.mock.calls[0][1]).toMatchObject({ runId: 'run-1', id: 'fn-1' })
  })
})

describe('GET /api/mercob/jobs/:id/runs (pagination)', () => {
  it('returns 404 when job not found', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/mercob/jobs/job-1/runs')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns paginated runs with totals', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaJobRun.findMany.mockResolvedValue([{ id: 'run-1', status: 'SUCCEEDED' }])
    mockPrismaJobRun.count.mockResolvedValue(1)

    const res = await request(app)
      .get('/api/mercob/jobs/job-1/runs')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.runs).toHaveLength(1)
    expect(res.body.total).toBe(1)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(20)
  })

  it('uses default page=1 and limit=20', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaJobRun.findMany.mockResolvedValue([])
    mockPrismaJobRun.count.mockResolvedValue(0)

    await request(app)
      .get('/api/mercob/jobs/job-1/runs')
      .set('Authorization', `Bearer ${token}`)

    expect(mockPrismaJobRun.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 20 })
  })

  it('clamps limit to maximum of 100', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaJobRun.findMany.mockResolvedValue([])
    mockPrismaJobRun.count.mockResolvedValue(0)

    const res = await request(app)
      .get('/api/mercob/jobs/job-1/runs?limit=500')
      .set('Authorization', `Bearer ${token}`)
    expect(res.body.limit).toBe(100)
  })

  it('uses provided page and limit for skip calculation', async () => {
    const token = await makeToken()
    mockPrismaScheduledJob.findFirst.mockResolvedValue(JOB)
    mockPrismaJobRun.findMany.mockResolvedValue([])
    mockPrismaJobRun.count.mockResolvedValue(0)

    await request(app)
      .get('/api/mercob/jobs/job-1/runs?page=3&limit=10')
      .set('Authorization', `Bearer ${token}`)

    expect(mockPrismaJobRun.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 10 })
  })
})
