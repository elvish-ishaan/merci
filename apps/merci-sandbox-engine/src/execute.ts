import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { executeInSandbox } from './docker'
import { logger } from './lib/logger'

const router = Router()

const executeSchema = z.object({
  code: z.string().min(1),
  language: z.enum(['js', 'ts']).default('js'),
  timeout: z.number().int().min(1).max(120).default(30),
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = executeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { code, language, timeout } = parsed.data

  try {
    const result = await executeInSandbox({ code, language, timeout })
    res.json(result)
  } catch (err: any) {
    logger.error({ err }, '[execute] sandbox execution failed')
    res.status(500).json({ error: err?.message ?? 'Execution failed' })
  }
})

export default router
