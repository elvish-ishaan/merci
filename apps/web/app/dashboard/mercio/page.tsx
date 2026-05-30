'use client'

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type MercioFn = {
  id: string
  name: string
  status: string
  entry: string
  buildCommand: string | null
  errorMessage: string | null
  bundleKey: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_CLASS: Record<string, string> = {
  DEPLOYED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  BUILDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  QUEUED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function invokeUrl(id: string) {
  return `${API_BASE}/mercio/${id}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={copy}
      className="ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function MercioPage() {
  const [functions, setFunctions] = useState<MercioFn[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [buildCommand, setBuildCommand] = useState('')
  const [entry, setEntry] = useState('index.js')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFunctions = useCallback(async () => {
    try {
      const data = await api.getMercioFunctions()
      setFunctions(data.functions)
    } catch {
      // ignore refresh errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFunctions()
  }, [fetchFunctions])

  // Poll while any function is in a non-terminal state
  useEffect(() => {
    const hasActive = functions.some((f) => f.status === 'QUEUED' || f.status === 'BUILDING')
    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(fetchFunctions, 2000)
    } else if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [functions, fetchFunctions])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!zipFile) { setError('Please select a zip file'); return }
    if (!name.trim()) { setError('Name is required'); return }

    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('zip', zipFile)
      fd.append('name', name.trim())
      if (buildCommand.trim()) fd.append('buildCommand', buildCommand.trim())
      if (entry.trim()) fd.append('entry', entry.trim())

      await api.uploadMercioFunction(fd)
      setOpen(false)
      setName('')
      setBuildCommand('')
      setEntry('index.js')
      setZipFile(null)
      await fetchFunctions()
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this function?')) return
    try {
      await api.deleteMercioFunction(id)
      setFunctions((prev) => prev.filter((f) => f.id !== id))
    } catch (err: any) {
      alert(err?.message ?? 'Delete failed')
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setZipFile(file)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Mercio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deploy and run serverless Node.js functions
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          New Function
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : functions.length === 0 ? (
        <div className="border border-border rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">No functions yet. Deploy your first one.</p>
          <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
            New Function
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {functions.map((fn) => {
            const url = invokeUrl(fn.id)
            const statusClass = STATUS_CLASS[fn.status] ?? 'bg-muted text-muted-foreground border-border'
            return (
              <div key={fn.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{fn.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}
                    >
                      {fn.status}
                    </span>
                  </div>

                  {fn.status === 'DEPLOYED' && (
                    <div className="flex items-center text-xs text-muted-foreground font-mono truncate">
                      <span className="truncate">{url}</span>
                      <CopyButton text={url} />
                    </div>
                  )}

                  {fn.status === 'FAILED' && fn.errorMessage && (
                    <p className="text-xs text-destructive mt-1 line-clamp-2">{fn.errorMessage}</p>
                  )}

                  <p className="text-xs text-muted-foreground/60 mt-1">
                    entry: {fn.entry}
                    {fn.buildCommand ? ` · build: ${fn.buildCommand}` : ''}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(fn.id)}
                >
                  Delete
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Mercio Function</DialogTitle>
            <DialogDescription>
              Upload a zip containing your Node.js handler. Entry must export{' '}
              <code className="text-xs bg-muted px-1 rounded">
                module.exports = async (req) =&gt; (&#123; status, headers, body &#125;)
              </code>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="fn-name">Function name</Label>
              <Input
                id="fn-name"
                placeholder="my-function"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fn-zip">Zip file</Label>
              <input
                ref={fileInputRef}
                id="fn-zip"
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
              />
              {zipFile && (
                <p className="text-xs text-muted-foreground">{zipFile.name} ({(zipFile.size / 1024).toFixed(1)} KB)</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fn-build">
                Build command <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="fn-build"
                placeholder="npm install"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fn-entry">Entry file</Label>
              <Input
                id="fn-entry"
                placeholder="index.js"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Uploading...' : 'Deploy'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
