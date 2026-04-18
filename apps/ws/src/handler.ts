import type { ServerWebSocket } from 'bun'
import { jwtVerify } from 'jose'
import prisma from '@repo/db'
import { redisSub, projectSubscribers } from './redis'

const secret = new TextEncoder().encode(process.env['JWT_SECRET']!)

export async function handleOpen(ws: ServerWebSocket<string>): Promise<void> {
  const url = new URL(ws.data)
  const pathParts = url.pathname.split('/')
  const projectId = pathParts[pathParts.length - 1] ?? ''
  const token = url.searchParams.get('token') ?? ''

  if (!projectId || !token) {
    ws.close(1008, 'Missing projectId or token')
    return
  }

  let userId: string
  try {
    const { payload } = await jwtVerify(token, secret)
    userId = payload['userId'] as string
  } catch {
    ws.close(1008, 'Invalid token')
    return
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, status: true },
  })

  if (!project) {
    ws.close(1008, 'Project not found or access denied')
    return
  }

  // Register client before querying DB so no live messages are missed
  if (!projectSubscribers.has(projectId)) {
    projectSubscribers.set(projectId, new Set())
  }
  const clients = projectSubscribers.get(projectId)!
  clients.add(ws)

  if (clients.size === 1) {
    await redisSub.subscribe(`build:${projectId}`)
  }

  // Replay historical logs so the client catches up
  const existingLogs = await prisma.buildLog.findMany({
    where: { projectId },
    orderBy: { id: 'asc' },
  })

  for (const log of existingLogs) {
    ws.send(
      JSON.stringify({ type: 'log', id: log.id, line: log.line, stream: log.stream, replayed: true }),
    )
  }

  // Send current status so the UI can sync immediately
  ws.send(JSON.stringify({ type: 'status', status: project.status }))
}

export function handleClose(ws: ServerWebSocket<string>): void {
  const url = new URL(ws.data)
  const pathParts = url.pathname.split('/')
  const projectId = pathParts[pathParts.length - 1] ?? ''

  const clients = projectSubscribers.get(projectId)
  if (!clients) return

  clients.delete(ws)
  if (clients.size === 0) {
    projectSubscribers.delete(projectId)
    redisSub.unsubscribe(`build:${projectId}`).catch(() => {})
  }
}
