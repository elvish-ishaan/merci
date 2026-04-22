import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import fs from 'node:fs/promises'
import path from 'node:path'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env['R2_ENDPOINT']!,
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY']!,
  },
})

export const BUCKET = process.env['R2_BUCKET_NAME']!

const CACHE_DIR = process.env['MERCIO_CACHE_DIR'] ?? '/var/mercio'

export async function ensureWorkerMjs(functionId: string): Promise<string> {
  const dir = path.join(CACHE_DIR, functionId)
  const filePath = path.join(dir, 'worker.mjs')

  try {
    await fs.access(filePath)
    return filePath
  } catch {
    // not cached yet
  }

  await fs.mkdir(dir, { recursive: true })
  const key = `mercio/${functionId}/worker.mjs`
  const resp = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  await pipeline(resp.Body as NodeJS.ReadableStream, createWriteStream(filePath))
  return filePath
}
