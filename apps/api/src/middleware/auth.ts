import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = await verifyToken(header.slice(7))
    res.locals['userId'] = payload.userId
    res.locals['email'] = payload.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
