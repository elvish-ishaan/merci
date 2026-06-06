import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { executeSandbox } from '../lib/sandbox-service'
import { logger } from '../lib/logger'

const sandbox = Router()

// POST /api/sandbox/execute
// Used by the future TS/Python SDK — same underlying logic as the MCP execute_code tool
sandbox.post('/execute', authMiddleware, async (req: Request, res: Response) => {
  const { code, language = 'js', timeout = 30 } = req.body as {
    code?: unknown
    language?: unknown
    timeout?: unknown
  }

  if (typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ error: '`code` must be a non-empty string' })
    return
  }

  if (language !== 'js' && language !== 'ts') {
    res.status(400).json({ error: '`language` must be "js" or "ts"' })
    return
  }

  const timeoutNum = Number(timeout)
  if (!Number.isInteger(timeoutNum) || timeoutNum < 1 || timeoutNum > 120) {
    res.status(400).json({ error: '`timeout` must be an integer between 1 and 120' })
    return
  }

  try {
    const result = await executeSandbox({ code, language, timeout: timeoutNum })
    res.json(result)
  } catch (err: any) {
    logger.error({ err }, '[sandbox] execution failed')
    res.status(500).json({ error: err?.message ?? 'Execution failed' })
  }
})

export default sandbox
