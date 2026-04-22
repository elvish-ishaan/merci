import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureWorkerMjs } from './r2'

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
    const resolved = require.resolve('workerd/bin/workerd')
    if (process.platform === 'win32') {
      const withExe = resolved + '.exe'
      if (require('node:fs').existsSync(withExe)) return withExe
    }
    return resolved
  } catch {
    return process.platform === 'win32' ? 'workerd.exe' : 'workerd'
  }
}

async function getFreePort(): Promise<number> {
  const server = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {}, open() {}, close() {}, error() {} } })
  const port = server.port
  server.stop(true)
  return port
}

function buildCapnpConfig(workerMjsPath: string, port: number): string {
  // workerd's embed path must be absolute and use forward slashes
  const embedPath = workerMjsPath.replace(/\\/g, '/')
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

  const proc = Bun.spawn([getWorkerdBin(), 'serve', configPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  await waitUntilReady(port)

  return { proc, port, lastUsedAt: Date.now() }
}

export async function ensure(functionId: string): Promise<{ port: number }> {
  const existing = pool.get(functionId)
  if (existing) {
    existing.lastUsedAt = Date.now()
    return { port: existing.port }
  }

  // Evict LRU if pool is at max
  if (pool.size >= POOL_MAX) {
    let oldest: [string, PoolEntry] | null = null
    for (const entry of pool.entries()) {
      if (!oldest || entry[1].lastUsedAt < oldest[1].lastUsedAt) oldest = entry
    }
    if (oldest) {
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
  }
}

// Periodic sweep to kill idle workers
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of pool.entries()) {
    if (now - entry.lastUsedAt > IDLE_TTL_MS) {
      console.log(`[mercio-runtime] Evicting idle worker for ${id}`)
      entry.proc.kill()
      pool.delete(id)
    }
  }
}, 60_000)
