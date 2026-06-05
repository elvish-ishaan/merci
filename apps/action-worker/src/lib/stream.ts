export type LogFn = (line: string, stream: 'stdout' | 'stderr') => void

export async function consumeStream(
  readable: ReadableStream<Uint8Array>,
  stream: 'stdout' | 'stderr',
  onLog: LogFn,
): Promise<void> {
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (buf) onLog(buf, stream)
        break
      }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (line) onLog(line, stream)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
