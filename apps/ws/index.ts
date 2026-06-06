import { handleOpen, handleClose } from './src/handler'
import { handleActionOpen, handleActionClose } from './src/actions-handler'
import { logger } from './src/lib/logger'

function isActionRun(rawUrl: string): boolean {
  return new URL(rawUrl).pathname.startsWith('/actions/')
}

if (!process.env['JWT_SECRET']) throw new Error('JWT_SECRET env var is required')

const port = Number(process.env['WS_PORT'] ?? 3002)

Bun.serve<string>({
  port,
  fetch(req, server) {
    // Pass the full request URL as ws.data so the handler can parse projectId + token
    const upgraded = server.upgrade(req, { data: req.url })
    if (!upgraded) return new Response('Not a WebSocket request', { status: 400 })
  },
  websocket: {
    async open(ws) {
      if (isActionRun(ws.data)) await handleActionOpen(ws)
      else await handleOpen(ws)
    },
    close(ws) {
      if (isActionRun(ws.data)) handleActionClose(ws)
      else handleClose(ws)
    },
    message() {
      // clients are read-only consumers; no inbound messages expected
    },
  },
})

logger.info({ port }, 'WS service running')
