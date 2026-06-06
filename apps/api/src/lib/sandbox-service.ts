export interface SandboxRequest {
  code: string
  language: 'js' | 'ts'
  timeout: number
}

export interface SandboxResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

export async function executeSandbox(req: SandboxRequest): Promise<SandboxResult> {
  const engineUrl = process.env['SANDBOX_ENGINE_URL']
  const engineSecret = process.env['SANDBOX_ENGINE_SECRET']

  if (!engineUrl || !engineSecret) {
    throw new Error('SANDBOX_ENGINE_URL and SANDBOX_ENGINE_SECRET env vars are required')
  }

  const { code, language, timeout } = req

  const res = await fetch(`${engineUrl}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${engineSecret}`,
    },
    body: JSON.stringify({ code, language, timeout }),
    signal: AbortSignal.timeout((timeout + 10) * 1000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Sandbox engine returned ${res.status}: ${body}`)
  }

  return res.json() as Promise<SandboxResult>
}
