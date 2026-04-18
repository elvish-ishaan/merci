import { Router, type Request, type Response, type NextFunction } from 'express'
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

function parseCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
}

async function serveFile(res: Response, projectId: string, subpath: string, noSpaFallback = false): Promise<void> {
  const key = `builds/${projectId}/${subpath}`
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const ext = subpath.split('.').pop()?.toLowerCase() ?? ''
    const contentType = MIME[ext] ?? 'application/octet-stream'
    const bytes = await obj.Body!.transformToByteArray()

    res.setHeader('Content-Type', contentType)
    // Cookie lets the assetFallback middleware know which project owns assets
    // requested via absolute paths (e.g. /assets/hero.png in JS bundles)
    res.setHeader('Set-Cookie', `mercy_pid=${encodeURIComponent(projectId)}; Path=/; SameSite=Lax; HttpOnly`)
    res.setHeader('Cache-Control', 'no-store')

    if (contentType === 'text/html') {
      // Rewrite absolute paths in HTML so <script>/<link> tags resolve correctly
      // under /app/{projectId}/ — Vite emits src="/assets/..." by default
      const html = Buffer.from(bytes).toString('utf-8').replace(/="\/(?!\/)/g, `="/app/${projectId}/`)
      res.send(html)
    } else {
      res.send(Buffer.from(bytes))
    }
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

appRouter.get('/:projectId', (req: Request, res: Response) =>
  serveFile(res, req.params.projectId, 'index.html'),
)

appRouter.get('/:projectId/*', (req: Request, res: Response) => {
  const subpath = (req.params as any)[0] || 'index.html'
  return serveFile(res, req.params.projectId, subpath, STATIC_EXT.test(subpath))
})

// Catches assets requested at root level (e.g. /assets/logo.svg from JS bundles).
// Vite embeds absolute paths in JS that bypass the /app/:projectId sub-path.
// We resolve the project via the mercy_pid cookie set when index.html was served.
export async function assetFallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== 'GET') return next()
  const projectId = parseCookie(req.headers.cookie ?? '', 'mercy_pid')
  if (!projectId) return next()
  const subpath = req.path.replace(/^\//, '')
  if (!STATIC_EXT.test(subpath) && !subpath.startsWith('assets/')) return next()
  await serveFile(res, projectId, subpath, true)
}

export default appRouter
