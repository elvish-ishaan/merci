'use client'

import { useEffect, useRef, useState } from 'react'

type LogLine = {
  id: number
  line: string
  stream: 'stdout' | 'stderr'
}

interface BuildLogsPanelProps {
  projectId: string
  projectName: string
  onClose: () => void
  onStatusChange?: (status: string) => void
}

export function BuildLogsPanel({ projectId, projectName, onClose, onStatusChange }: BuildLogsPanelProps) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const maxReplayedIdRef = useRef<number>(-1)
  // Keep a stable ref to the latest callback so the WS effect never needs to re-run when the
  // parent re-renders and produces a new function identity for onStatusChange.
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const apiUrl = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3002'
    const ws = new WebSocket(`${apiUrl}/${projectId}?token=${encodeURIComponent(token)}`)

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
        onStatusChangeRef.current?.(msg.status)
      }
    }

    return () => ws.close()
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col" style={{ height: '40vh' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 font-mono">Build logs — {projectName}</span>
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-neutral-600'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close logs"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5">
        {error && <p className="text-red-400 mb-2">{error}</p>}
        {lines.length === 0 && !error && (
          <p className="text-neutral-600">Waiting for build output…</p>
        )}
        {lines.map((l) => (
          <div key={l.id} className={l.stream === 'stderr' ? 'text-red-400' : 'text-neutral-300'}>
            {l.line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
