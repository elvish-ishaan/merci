'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

type LogLine = {
  id: number
  line: string
  stream: 'stdout' | 'stderr'
}

export default function ProjectLogsPage() {
  const { id } = useParams<{ id: string }>()
  const [lines, setLines] = useState<LogLine[]>([])
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const maxReplayedIdRef = useRef<number>(-1)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3002'
    const ws = new WebSocket(`${wsUrl}/${id}?token=${encodeURIComponent(token)}`)

    ws.onopen = () => setConnected(true)
    ws.onerror = () => setError('WebSocket connection failed')
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as
        | { type: 'log'; id: number; line: string; stream: 'stdout' | 'stderr'; replayed?: boolean }
        | { type: 'status'; status: string }

      if (msg.type === 'log') {
        if (msg.replayed) {
          maxReplayedIdRef.current = Math.max(maxReplayedIdRef.current, msg.id)
          setLines((prev) => [...prev, { id: msg.id, line: msg.line, stream: msg.stream }])
        } else if (msg.id > maxReplayedIdRef.current) {
          setLines((prev) => [...prev, { id: msg.id, line: msg.line, stream: msg.stream }])
        }
      } else if (msg.type === 'status') {
        setStatus(msg.status)
      }
    }

    return () => ws.close()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? 'Streaming live' : 'Disconnected'}
        </span>
        {status && (
          <span className="text-xs text-muted-foreground">
            · Status: <span className="text-foreground/70">{status}</span>
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5 bg-background">
        {error && <p className="text-destructive mb-2">{error}</p>}
        {lines.length === 0 && !error && (
          <p className="text-muted-foreground/50">Waiting for build output…</p>
        )}
        {lines.map((l) => (
          <div key={l.id} className={l.stream === 'stderr' ? 'text-destructive' : 'text-foreground/80'}>
            {l.line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
