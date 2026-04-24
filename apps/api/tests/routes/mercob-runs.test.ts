import { describe, it, expect, beforeEach } from 'bun:test'
import request from 'supertest'
import app from '../helpers/app'
import { mockPrismaJobRun, resetAllMocks } from '../helpers/setup'
import { signToken } from '../../src/lib/jwt'

beforeEach(resetAllMocks)

async function makeToken(userId = 'u-1') {
  return signToken({ userId, email: 'user@example.com' })
}

const RUN_WITH_LOGS = {
  id: 'run-1',
  jobId: 'job-1',
  attempt: 1,
  status: 'SUCCEEDED',
  scheduledFor: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: 250,
  httpStatus: 200,
  responseBody: '{"ok":true}',
  errorMessage: null,
  createdAt: new Date().toISOString(),
  logs: [
    { id: 1, runId: 'run-1', line: 'Starting...', stream: 'stdout', createdAt: new Date().toISOString() },
    { id: 2, runId: 'run-1', line: 'Done.', stream: 'stdout', createdAt: new Date().toISOString() },
  ],
  job: { id: 'job-1', name: 'My Job', functionId: 'fn-1' },
}

describe('GET /api/mercob/runs/:runId', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/mercob/runs/run-1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when run does not belong to user', async () => {
    const token = await makeToken()
    mockPrismaJobRun.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/mercob/runs/run-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })

  it('verifies ownership via nested job.userId filter', async () => {
    const token = await makeToken('u-1')
    mockPrismaJobRun.findFirst.mockResolvedValue(RUN_WITH_LOGS)

    await request(app)
      .get('/api/mercob/runs/run-1')
      .set('Authorization', `Bearer ${token}`)

    const query = mockPrismaJobRun.findFirst.mock.calls[0][0]
    expect(query.where).toMatchObject({ id: 'run-1', job: { userId: 'u-1' } })
  })

  it('returns run with logs and job info', async () => {
    const token = await makeToken()
    mockPrismaJobRun.findFirst.mockResolvedValue(RUN_WITH_LOGS)

    const res = await request(app)
      .get('/api/mercob/runs/run-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.run.id).toBe('run-1')
    expect(res.body.run.logs).toHaveLength(2)
    expect(res.body.run.job.name).toBe('My Job')
    expect(res.body.run.status).toBe('SUCCEEDED')
  })

  it('includes httpStatus and responseBody in the response', async () => {
    const token = await makeToken()
    mockPrismaJobRun.findFirst.mockResolvedValue(RUN_WITH_LOGS)

    const res = await request(app)
      .get('/api/mercob/runs/run-1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.body.run.httpStatus).toBe(200)
    expect(res.body.run.responseBody).toBe('{"ok":true}')
  })
})
