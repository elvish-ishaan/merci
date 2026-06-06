'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type SandboxApiKey } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Box, Plus, Trash2, Copy, Check, Key } from 'lucide-react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const MCP_URL = `${BASE}/mcp`

export default function SandboxPage() {
  const [keys, setKeys] = useState<SandboxApiKey[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Reveal dialog — shown once after creation
  const [revealKey, setRevealKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.getSandboxKeys()
      setKeys(data.keys)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function handleCreate() {
    if (!keyName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const { key, plainKey } = await api.createSandboxKey(keyName.trim())
      setKeys((prev) => [key, ...prev])
      setCreateOpen(false)
      setKeyName('')
      setRevealKey(plainKey)
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(key: SandboxApiKey) {
    if (!confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return
    try {
      await api.deleteSandboxKey(key.id)
      setKeys((prev) => prev.filter((k) => k.id !== key.id))
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete key')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Sandbox</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Run AI-generated code in isolated containers via MCP
          </p>
        </div>
        <Button size="sm" onClick={() => { setKeyName(''); setCreateError(''); setCreateOpen(true) }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New API Key
        </Button>
      </div>

      {/* MCP connection info */}
      <div className="border border-border rounded-lg p-4 mb-6 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">MCP Server</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Server URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-card border border-border rounded px-3 py-2 font-mono text-foreground truncate">
                {MCP_URL}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => copyToClipboard(MCP_URL)}
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Add to your MCP client config (e.g. Claude Desktop):</p>
            <pre className="bg-card border border-border rounded px-3 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto">{`{
  "mcpServers": {
    "merci-sandbox": {
      "type": "http",
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer <your-api-key>" }
    }
  }
}`}</pre>
          </div>
        </div>
      </div>

      {/* API Keys list */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">API Keys</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : keys.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center">
            <Key className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No API keys yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
              Create a key to authenticate your MCP client.
            </p>
            <Button size="sm" onClick={() => { setKeyName(''); setCreateError(''); setCreateOpen(true) }}>
              Create your first key
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-lg divide-y divide-border">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 px-4 py-3">
                <Key className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <code className="font-mono">{key.keyPrefix}</code>
                    <span>·</span>
                    <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                    {key.lastUsedAt && (
                      <>
                        <span>·</span>
                        <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 shrink-0"
                  onClick={() => handleDelete(key)}
                  title="Revoke key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Claude Desktop"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating || !keyName.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal dialog — shown once */}
      <Dialog open={!!revealKey} onOpenChange={() => setRevealKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Copy this key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted border border-border rounded px-3 py-2 break-all">
                {revealKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => revealKey && copyToClipboard(revealKey)}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setRevealKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
