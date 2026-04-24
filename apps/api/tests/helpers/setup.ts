/**
 * Preload file — runs before every test file via bunfig.toml [test].preload.
 * Sets environment variables and registers mock.module() overrides so that
 * all static imports in route/middleware files receive mock versions.
 */
import { mock } from 'bun:test'

// ── Env vars (must be set before any module reads process.env at load time) ──
process.env['WORKER_SECRET'] = 'test-worker-secret'
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters!'
process.env['GITHUB_CLIENT_ID'] = 'test-gh-client-id'
process.env['GITHUB_CLIENT_SECRET'] = 'test-gh-client-secret'
process.env['GITHUB_REDIRECT_URI'] = 'http://localhost:3001/auth/github/callback'
process.env['FRONTEND_URL'] = 'http://localhost:3000'
process.env['BASE_DOMAIN'] = 'test.example.com'
process.env['API_BASE_URL'] = 'http://localhost:3001'
process.env['R2_BUCKET_NAME'] = 'test-bucket'
process.env['R2_ENDPOINT'] = 'http://r2.test'
process.env['R2_ACCESS_KEY_ID'] = 'test-key'
process.env['R2_SECRET_ACCESS_KEY'] = 'test-secret-key'
process.env['REDIS_HOST'] = 'localhost'
process.env['REDIS_PORT'] = '6379'

// ── Prisma mock ──────────────────────────────────────────────────────────────

export const mockPrismaUser = {
  findUnique: mock<any>(),
  create: mock<any>(),
  update: mock<any>(),
}

export const mockPrismaProject = {
  findUnique: mock<any>(),
  findMany: mock<any>(),
  create: mock<any>(),
  update: mock<any>(),
}

export const mockPrismaCustomDomain = {
  findUnique: mock<any>(),
  findFirst: mock<any>(),
  findMany: mock<any>(),
  create: mock<any>(),
  update: mock<any>(),
  delete: mock<any>(),
}

export const mockPrismaMercioFunction = {
  create: mock<any>(),
  findMany: mock<any>(),
  findFirst: mock<any>(),
  findUnique: mock<any>(),
  delete: mock<any>(),
}

export const mockPrismaScheduledJob = {
  create: mock<any>(),
  findMany: mock<any>(),
  findFirst: mock<any>(),
  update: mock<any>(),
  delete: mock<any>(),
}

export const mockPrismaJobRun = {
  create: mock<any>(),
  findFirst: mock<any>(),
  findMany: mock<any>(),
  update: mock<any>(),
  count: mock<any>(),
}

export const mockPrismaJobRunLog = { create: mock<any>() }
export const mockPrismaBuildLog = { create: mock<any>() }
export const mockPrismaEnvVar = { createMany: mock<any>() }
export const mockPrismaTransaction = mock<any>((cb: Function) => cb(mockPrisma))

export const mockPrisma = {
  user: mockPrismaUser,
  project: mockPrismaProject,
  customDomain: mockPrismaCustomDomain,
  mercioFunction: mockPrismaMercioFunction,
  scheduledJob: mockPrismaScheduledJob,
  jobRun: mockPrismaJobRun,
  jobRunLog: mockPrismaJobRunLog,
  buildLog: mockPrismaBuildLog,
  envVar: mockPrismaEnvVar,
  $transaction: mockPrismaTransaction,
}

mock.module('../../src/lib/prisma', () => ({ default: mockPrisma }))

// ── Redis mock ───────────────────────────────────────────────────────────────

export const mockRedisPubPublish = mock<any>(() => Promise.resolve(1))
export const mockRedisPub = { publish: mockRedisPubPublish }

mock.module('../../src/lib/redis', () => ({ redisPub: mockRedisPub }))

// ── R2 / S3 mock ─────────────────────────────────────────────────────────────

export const mockR2Send = mock<any>(() => Promise.resolve({}))

mock.module('../../src/lib/r2', () => ({
  r2: { send: mockR2Send },
  BUCKET: 'test-bucket',
}))

// ── Logger mock ──────────────────────────────────────────────────────────────

const silentLogger = {
  info: mock<any>(() => undefined),
  debug: mock<any>(() => undefined),
  error: mock<any>(() => undefined),
  warn: mock<any>(() => undefined),
  child: mock<any>(() => silentLogger),
}

mock.module('../../src/lib/logger', () => ({ logger: silentLogger }))
mock.module('@repo/logger', () => ({ createLogger: () => silentLogger }))

// ── BullMQ mock ───────────────────────────────────────────────────────────────

export const mockJobWaitUntilFinished = mock<any>(() =>
  Promise.resolve({ status: 200, headers: {}, body: 'ok' })
)
export const mockQueueAdd = mock<any>(() =>
  Promise.resolve({ id: 'mock-job-id', waitUntilFinished: mockJobWaitUntilFinished })
)

class MockQueue {
  add = mockQueueAdd
}
class MockQueueEvents {}

mock.module('bullmq', () => ({
  Queue: MockQueue,
  QueueEvents: MockQueueEvents,
}))

// ── bcryptjs mock ─────────────────────────────────────────────────────────────

export const mockBcryptHash = mock<any>(() => Promise.resolve('hashed-password'))
export const mockBcryptCompare = mock<any>(() => Promise.resolve(true))

mock.module('bcryptjs', () => ({
  default: { hash: mockBcryptHash, compare: mockBcryptCompare },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}))

// ── @repo/crypto mock ─────────────────────────────────────────────────────────

export const mockEncryptValue = mock<any>((v: string) => `enc:${v}`)
export const mockDecryptValue = mock<any>((v: string) =>
  v.startsWith('enc:') ? v.slice(4) : v
)

mock.module('@repo/crypto', () => ({
  encryptValue: mockEncryptValue,
  decryptValue: mockDecryptValue,
}))

// ── DNS mock ──────────────────────────────────────────────────────────────────

export const mockResolveCname = mock<any>(() => Promise.resolve([]))

mock.module('dns', () => ({
  promises: { resolveCname: mockResolveCname },
}))

// ── nanoid mock ───────────────────────────────────────────────────────────────

export const mockNanoidFn = mock<any>(() => 'abcdef')
export const mockCustomAlphabet = mock<any>(() => mockNanoidFn)

mock.module('nanoid', () => ({
  customAlphabet: mockCustomAlphabet,
  nanoid: mockNanoidFn,
}))

// ── Global fetch mock ──────────────────────────────────────────────────────────

export const mockFetch = mock<any>()
globalThis.fetch = mockFetch

// ── Utility: reset all mocks between tests ────────────────────────────────────

export function resetAllMocks() {
  for (const model of [
    mockPrismaUser,
    mockPrismaProject,
    mockPrismaCustomDomain,
    mockPrismaMercioFunction,
    mockPrismaScheduledJob,
    mockPrismaJobRun,
  ]) {
    for (const fn of Object.values(model)) {
      if (typeof (fn as any).mockReset === 'function') (fn as any).mockReset()
    }
  }
  mockPrismaJobRunLog.create.mockReset()
  mockPrismaBuildLog.create.mockReset()
  mockPrismaEnvVar.createMany.mockReset()
  mockPrismaTransaction.mockReset()
  mockRedisPubPublish.mockReset()
  mockR2Send.mockReset()
  mockQueueAdd.mockReset()
  mockJobWaitUntilFinished.mockReset()
  mockBcryptHash.mockReset()
  mockBcryptCompare.mockReset()
  mockEncryptValue.mockReset()
  mockDecryptValue.mockReset()
  mockResolveCname.mockReset()
  mockFetch.mockReset()
  mockNanoidFn.mockReset()

  // Re-apply sensible defaults
  mockPrismaTransaction.mockImplementation((cb: Function) => cb(mockPrisma))
  mockBcryptHash.mockResolvedValue('hashed-password')
  mockBcryptCompare.mockResolvedValue(true)
  mockEncryptValue.mockImplementation((v: string) => `enc:${v}`)
  mockDecryptValue.mockImplementation((v: string) =>
    v.startsWith('enc:') ? v.slice(4) : v
  )
  mockR2Send.mockResolvedValue({})
  mockQueueAdd.mockResolvedValue({
    id: 'mock-job-id',
    waitUntilFinished: mockJobWaitUntilFinished,
  })
  mockJobWaitUntilFinished.mockResolvedValue({ status: 200, headers: {}, body: 'ok' })
  mockRedisPubPublish.mockResolvedValue(1)
  mockNanoidFn.mockReturnValue('abcdef')
}
