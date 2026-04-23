import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { logger } from '../lib/logger'

const auth = Router()

auth.post('/register', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'email already registered' })
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hashed } })

  logger.debug({ userId: user.id }, 'user registered')

  const token = await signToken({ userId: user.id, email: user.email })
  res.status(201).json({ token, userId: user.id })
})

auth.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  logger.debug({ email }, 'login attempt')

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'invalid credentials' })
    return
  }

  logger.debug({ userId: user.id }, 'login successful')

  const token = await signToken({ userId: user.id, email: user.email })
  res.json({ token, userId: user.id })
})

export default auth
