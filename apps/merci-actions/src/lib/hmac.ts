import { createHmac, timingSafeEqual } from 'crypto'

export function verifyWebhookSignature(rawBody: Buffer, secret: string, signature: string): boolean {
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  if (expected.length !== signature.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
