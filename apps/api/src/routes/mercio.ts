import { Router } from 'express'
import multer from 'multer'
import { Queue } from 'bullmq'
import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { r2, BUCKET } from '../lib/r2'
import { logger } from '../lib/logger'

const mercio = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true)
    } else {
      cb(new Error('Only zip files are allowed'))
    }
  },
})

const buildQueue = new Queue('mercio-builds', {
  connection: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
  },
})

const API_BASE_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001'

mercio.post('/upload', authMiddleware, upload.single('zip'), async (req, res) => {
  const userId = res.locals['userId'] as string
  const { name, entry } = req.body as {
    name?: string
    entry?: string
  }

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  if (!req.file) {
    res.status(400).json({ error: 'zip file is required' })
    return
  }

  const fn = await prisma.mercioFunction.create({
    data: {
      userId,
      name: name.trim(),
      entry: entry?.trim() || 'index.js',
      status: 'QUEUED',
    },
  })

  const zipKey = `mercio/${fn.id}/source.zip`
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: zipKey,
      Body: req.file.buffer,
      ContentType: 'application/zip',
    })
  )

  await buildQueue.add('build', {
    functionId: fn.id,
    zipKey,
    entry: fn.entry,
  })

  logger.debug({ functionId: fn.id, userId, entry: fn.entry }, 'mercio build job queued')

  res.status(201).json({
    id: fn.id,
    name: fn.name,
    status: fn.status,
    invokeUrl: `${API_BASE_URL}/mercio/${fn.id}`,
  })
})

mercio.get('/', authMiddleware, async (_req, res) => {
  const userId = res.locals['userId'] as string
  const functions = await prisma.mercioFunction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      entry: true,
      errorMessage: true,
      bundleKey: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  res.json({ functions })
})

mercio.get('/:id', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const fn = await prisma.mercioFunction.findFirst({
    where: { id: req.params['id'], userId },
  })
  if (!fn) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json({ function: fn, invokeUrl: `${API_BASE_URL}/mercio/${fn.id}` })
})

mercio.delete('/:id', authMiddleware, async (req, res) => {
  const userId = res.locals['userId'] as string
  const fn = await prisma.mercioFunction.findFirst({
    where: { id: req.params['id'], userId },
  })
  if (!fn) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const prefix = `mercio/${fn.id}/`
  const listed = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }))
  await Promise.all(
    (listed.Contents ?? []).map((obj) =>
      r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key! }))
    )
  )

  await prisma.mercioFunction.delete({ where: { id: fn.id } })

  logger.debug({ functionId: fn.id, userId }, 'mercio function deleted')

  res.json({ ok: true })
})

export default mercio
