import { Router } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { signToken, verifyToken } from '../lib/jwt'
import { encryptValue, decryptValue } from '@repo/crypto'

const github = Router()

const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID']!
const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET']!
const GITHUB_REDIRECT_URI = process.env['GITHUB_REDIRECT_URI'] ?? 'http://localhost:3001/auth/github/callback'
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'

// GET /auth/github — redirect to GitHub OAuth, scoped to the logged-in user via JWT query param
github.get('/auth/github', async (req, res) => {
  const { token } = req.query as { token?: string }
  if (!token) {
    res.status(400).json({ error: 'Missing token' })
    return
  }

  let userId: string
  try {
    const payload = await verifyToken(token)
    userId = payload.userId
  } catch {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  // Short-lived state JWT so we can recover userId in the callback
  const state = await signToken({ userId, email: '' })

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'repo user:email',
    state,
  })

  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
})

// GET /auth/github/callback — GitHub redirects here after user authorizes
github.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string }

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/dashboard?github=error`)
    return
  }

  let userId: string
  try {
    const payload = await verifyToken(state)
    userId = payload.userId
  } catch {
    res.redirect(`${FRONTEND_URL}/dashboard?github=error`)
    return
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  })

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string }
  if (!tokenData.access_token) {
    res.redirect(`${FRONTEND_URL}/dashboard?github=error`)
    return
  }

  const accessToken = tokenData.access_token

  // Fetch GitHub user ID
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'mercy-app' },
  })
  const ghUser = await userRes.json() as { id: number }

  await prisma.user.update({
    where: { id: userId },
    data: {
      githubId: String(ghUser.id),
      githubAccessToken: encryptValue(accessToken),
    },
  })

  res.redirect(`${FRONTEND_URL}/dashboard?github=connected`)
})

// GET /github/status — whether the current user has connected GitHub
github.get('/github/status', authMiddleware, async (_req, res) => {
  const userId = res.locals['userId'] as string
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { githubAccessToken: true } })
  res.json({ connected: !!user?.githubAccessToken })
})

// GET /github/repos — list the user's GitHub repos (public + private)
github.get('/github/repos', authMiddleware, async (_req, res) => {
  const userId = res.locals['userId'] as string
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { githubAccessToken: true } })

  if (!user?.githubAccessToken) {
    res.status(400).json({ error: 'GitHub not connected' })
    return
  }

  const token = decryptValue(user.githubAccessToken)

  const ghRes = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
    { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'mercy-app' } },
  )

  if (!ghRes.ok) {
    res.status(502).json({ error: 'Failed to fetch GitHub repos' })
    return
  }

  const raw = await ghRes.json() as Array<{
    id: number
    full_name: string
    private: boolean
    description: string | null
    clone_url: string
    updated_at: string
  }>

  const repos = raw.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    private: r.private,
    description: r.description,
    cloneUrl: r.clone_url,
    updatedAt: r.updated_at,
  }))

  res.json({ repos })
})

export default github
