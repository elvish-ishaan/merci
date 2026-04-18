import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile } from 'fs/promises'
import { join, relative } from 'path'
import fs from 'fs-extra'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env['R2_ENDPOINT']!,
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID']!,
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY']!,
  },
})

const BUCKET = process.env['R2_BUCKET_NAME']!

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

export async function uploadDir(localDir: string, prefix: string): Promise<void> {
  const files = await walkDir(localDir)
  await Promise.all(
    files.map(async (filePath) => {
      const key = `${prefix}/${relative(localDir, filePath).replace(/\\/g, '/')}`
      const body = await readFile(filePath)
      await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }))
    }),
  )
}
