import Redis from 'ioredis'

export const redisConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

export const redisPub = new Redis(redisConnection)
