import Redis from 'ioredis'

const redisConfig = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
}

export const redisPub = new Redis(redisConfig)
export const redisConnection = redisConfig
