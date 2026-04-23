import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureWorkerMjs } from './r2'
import { logger } from './lib/logger'

const CACHE_DIR = process.env['MERCIO_CACHE_DIR'] ?? '/var/mercio'
const POOL_MAX = Number(process.env['MERCIO_POOL_MAX'] ?? '20')
const IDLE_TTL_MS = Number(process.env['MERCIO_IDLE_TTL_MS'] ?? String(5 * 60 * 1000))

interface PoolEntry {
  proc: ReturnType<typeof Bun.spawn>
  port: number
  lastUsedAt: number
}

const pool = new Map<string, PoolEntry>()

function getWorkerdBin(): string {
  return process.env['WORKERD_BIN'] ?? resolveWorkerdBin()
}

function resolveWorkerdBin(): string {
  try {
    const pkgDir = path.dirname(require.resolve('workerd/package.json'))
    const binName = process.platform === 'win32' ? 'workerd.exe' : 'workerd'
    const binPath = path.join(pkgDir, 'bin', binName)
    if (require('node:fs').existsSync(binPath)) return binPath
  } catch {}
  return process.platform === 'win32' ? 'workerd.exe' : 'workerd'
}

async function getFreePort(): Promise<number> {
  const server = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {}, open() {}, close() {}, error() {} } })
  const port = server.port
  server.stop(true)
  return port
}

function buildCapnpConfig(workerMjsPath: string, port: number): string {
  // workerd resolves `embed` paths relative to the .capnp file. worker.mjs sits
  // next to config.capnp, so just reference it by basename.
  const embedPath = path.basename(workerMjsPath)
  return `using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .mercioWorker),
  ],
  sockets = [
    (name = "http", address = "127.0.0.1:${port}", http = (), service = "main"),
  ],
);

const mercioWorker :Workerd.Worker = (
  modules = [
    (name = "worker", esModule = embed "${embedPath}"),
  ],
  compatibilityDate = "2025-01-01",
  compatibilityFlags = ["nodejs_compat"],
);
`
}

async function waitUntilReady(port: number, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`)
      if (res.status !== undefined) return
    } catch {
      await Bun.sleep(50)
    }
  }
  throw new Error(`workerd did not start on port ${port} within ${timeoutMs}ms`)
}

async function spawnWorkerd(functionId: string, workerMjsPath: string): Promise<PoolEntry> {
  const port = await getFreePort()
  const configDir = path.join(CACHE_DIR, functionId)
  await fs.mkdir(configDir, { recursive: true })

  const configPath = path.join(configDir, 'config.capnp')
  await fs.writeFile(configPath, buildCapnpConfig(workerMjsPath, port), 'utf8')

  const bin = getWorkerdBin()
  logger.info({ functionId, port, bin }, 'spawning workerd')

  const proc = Bun.spawn([bin, 'serve', configPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const pipeStream = async (stream: ReadableStream<Uint8Array> | null, pipe: string) => {
    if (!stream) return
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed) logger.debug({ functionId, pipe }, trimmed)
      }
    }
  }
  void pipeStream(proc.stdout as ReadableStream<Uint8Array>, 'stdout')
  void pipeStream(proc.stderr as ReadableStream<Uint8Array>, 'stderr')

  proc.exited.then((code) => {
    logger.info({ functionId, code }, 'workerd exited')
  })

  try {
    await waitUntilReady(port)
  } catch (err) {
    proc.kill()
    throw err
  }

  return { proc, port, lastUsedAt: Date.now() }
}

export async function ensure(functionId: string): Promise<{ port: number }> {
  const existing = pool.get(functionId)
  if (existing) {
    existing.lastUsedAt = Date.now()
    logger.debug({ functionId }, 'workerd pool cache hit')
    return { port: existing.port }
  }

  // Evict LRU if pool is at max
  if (pool.size >= POOL_MAX) {
    let oldest: [string, PoolEntry] | null = null
    for (const entry of pool.entries()) {
      if (!oldest || entry[1].lastUsedAt < oldest[1].lastUsedAt) oldest = entry
    }
    if (oldest) {
      logger.debug({ poolSize: pool.size, evictedFunctionId: oldest[0] }, 'LRU eviction triggered')
      oldest[1].proc.kill()
      pool.delete(oldest[0])
    }
  }

  const workerMjsPath = await ensureWorkerMjs(functionId)
  const entry = await spawnWorkerd(functionId, workerMjsPath)
  pool.set(functionId, entry)
  return { port: entry.port }
}

export function evict(functionId: string): void {
  const entry = pool.get(functionId)
  if (entry) {
    entry.proc.kill()
    pool.delete(functionId)
    logger.info({ functionId }, 'workerd evicted')
  }
}

// Periodic sweep to kill idle workers
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of pool.entries()) {
    if (now - entry.lastUsedAt > IDLE_TTL_MS) {
      logger.info({ functionId: id }, 'evicting idle workerd')
      entry.proc.kill()
      pool.delete(id)
    }
  }
}, 60_000)
