import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env['JWT_SECRET']!)

export async function verifyToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, secret)
  return payload as { userId: string; email: string }
}
