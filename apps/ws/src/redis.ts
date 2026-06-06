import Redis from 'ioredis'
import type { ServerWebSocket } from 'bun'

export const redisSub = new Redis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
})

// build:<projectId> → project deploy log subscribers
export const projectSubscribers = new Map<string, Set<ServerWebSocket<string>>>()
// action:run:<runId> → Actions run subscribers (status + logs)
export const runSubscribers = new Map<string, Set<ServerWebSocket<string>>>()

redisSub.on('message', (channel: string, message: string) => {
  if (channel.startsWith('action:run:')) {
    const runId = channel.slice('action:run:'.length)
    const clients = runSubscribers.get(runId)
    if (!clients) return
    for (const ws of clients) ws.send(message)
    return
  }

  const projectId = channel.replace(/^build:/, '')
  const clients = projectSubscribers.get(projectId)
  if (!clients) return
  for (const ws of clients) {
    ws.send(message)
  }
})
