import pino from 'pino'
import pretty from 'pino-pretty'

const isDev = process.env['NODE_ENV'] !== 'production'

// Paths whose values are replaced with '[REDACTED]' in every log line.
// Covers Bearer tokens in HTTP headers, auth fields in request bodies,
// GitHub OAuth tokens in job data, and encrypted env var payloads.
const REDACT_PATHS = [
  'req.headers.authorization',
  'password',
  'token',
  'githubToken',
  'encryptedValue',
  '*.password',
  '*.token',
  '*.githubToken',
  '*.encryptedValue',
]

export function createLogger(service: string) {
  const options: pino.LoggerOptions = {
    name: service,
    level: isDev ? 'debug' : 'info',
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  }

  if (isDev) {
    // Use pino-pretty as a direct stream to avoid pino's worker_threads transport,
    // which cannot resolve module paths in Bun's runtime environment.
    const stream = pretty({ colorize: true, ignore: 'pid,hostname', translateTime: 'HH:MM:ss' })
    return pino(options, stream)
  }

  return pino(options)
}

export type { Logger } from 'pino'
