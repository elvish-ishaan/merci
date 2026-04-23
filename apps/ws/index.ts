import { handleOpen, handleClose } from './src/handler'
import { logger } from './src/lib/logger'

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
      await handleOpen(ws)
    },
    close(ws) {
      handleClose(ws)
    },
    message() {
      // clients are read-only consumers; no inbound messages expected
    },
  },
})

logger.info({ port }, 'WS service running')
