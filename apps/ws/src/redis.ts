import Redis from 'ioredis'
import type { ServerWebSocket } from 'bun'

export const redisSub = new Redis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
})

export const projectSubscribers = new Map<string, Set<ServerWebSocket<string>>>()

redisSub.on('message', (channel: string, message: string) => {
  const projectId = channel.replace(/^build:/, '')
  const clients = projectSubscribers.get(projectId)
  if (!clients) return
  for (const ws of clients) {
    ws.send(message)
  }
})
