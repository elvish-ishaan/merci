import { Router, type Request, type Response, type NextFunction } from 'express'
import { randomUUID, createHash } from 'crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createSandboxMcpServer } from '../mcp/server'
import { logger } from '../lib/logger'
import prisma from '../lib/prisma'

const mcp = Router()

// Session store: maps Mcp-Session-Id → transport
const transports = new Map<string, StreamableHTTPServerTransport>()

async function mcpAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const keyHash = createHash('sha256').update(header.slice(7)).digest('hex')
  const record = await prisma.sandboxApiKey.findUnique({ where: { keyHash } })
  if (!record) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }

  // Update lastUsedAt without blocking the request
  prisma.sandboxApiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})

  next()
}

mcp.post('/', mcpAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  let transport: StreamableHTTPServerTransport

  if (sessionId && transports.has(sessionId)) {
    transport = transports.get(sessionId)!
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport)
        logger.debug({ sessionId: id }, '[mcp] session initialized')
      },
    })

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId)
        logger.debug({ sessionId: transport.sessionId }, '[mcp] session closed')
      }
    }

    const server = createSandboxMcpServer()
    await server.connect(transport)
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: missing or invalid session' },
      id: null,
    })
    return
  }

  await transport.handleRequest(req, res, req.body)
})

async function handleSessionRequest(req: Request, res: Response) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' })
    return
  }
  await transports.get(sessionId)!.handleRequest(req, res)
}

mcp.get('/', mcpAuth, handleSessionRequest)
mcp.delete('/', mcpAuth, handleSessionRequest)

export default mcp
