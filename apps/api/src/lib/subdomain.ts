import { customAlphabet } from 'nanoid'
import prisma from './prisma'

const RESERVED = new Set(['auth', 'deploy', 'internal', 'health', 'api', 'www'])
const nanoid6 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)
const nanoid7 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7)

export async function generateUniqueSubdomain(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = nanoid6()
    if (RESERVED.has(id)) continue
    const exists = await prisma.project.findUnique({ where: { subdomain: id }, select: { id: true } })
    if (!exists) return id
  }
  const fallback = nanoid7()
  const exists = await prisma.project.findUnique({ where: { subdomain: fallback }, select: { id: true } })
  if (!exists) return fallback
  throw new Error('Could not generate unique subdomain')
}
