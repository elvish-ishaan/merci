import { customAlphabet } from 'nanoid'
import prisma from './prisma'

const RESERVED = new Set(['auth', 'deploy', 'internal', 'health', 'api', 'www'])
const nanoid6 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)
const nanoid7 = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 7)

export async function generateUniqueSubdomain(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = nanoid6()
    if (RESERVED.has(id)) continue
    try {
      const exists = await prisma.project.findUnique({ where: { subdomain: id }, select: { id: true } })
      if (!exists) return id
    } catch (error) {
      throw new Error(`Database error while generating subdomain: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  const fallback = nanoid7()
  try {
    const exists = await prisma.project.findUnique({ where: { subdomain: fallback }, select: { id: true } })
    if (!exists) return fallback
  } catch (error) {
    throw new Error(`Database error while generating subdomain: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  throw new Error('Could not generate unique subdomain')
}
