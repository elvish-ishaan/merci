import { Router, type Request, type Response } from 'express'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { r2, BUCKET } from '../lib/r2'

const MIME: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  webp: 'image/webp',
  gif: 'image/gif',
  map: 'application/json',
}

const STATIC_EXT = /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|json|webp|gif|map|txt|xml)$/i

async function serveFile(res: Response, projectId: string, subpath: string, noSpaFallback = false): Promise<void> {
  const key = `builds/${projectId}/${subpath}`
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const ext = subpath.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'application/octet-stream'
    const bytes = await obj.Body!.transformToByteArray()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'no-store')
    res.send(Buffer.from(bytes))
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      if (!noSpaFallback) return serveFile(res, projectId, 'index.html', true)
      res.status(404).json({ error: 'Not found' })
    } else {
      res.status(500).json({ error: 'Internal error' })
    }
  }
}

const appRouter = Router()

appRouter.get('/*', (req: Request, res: Response) => {
  const projectId = (req as any).subdomainProjectId as string
  const subpath = req.path.replace(/^\//, '') || 'index.html'
  return serveFile(res, projectId, subpath, STATIC_EXT.test(subpath))
})

export default appRouter
