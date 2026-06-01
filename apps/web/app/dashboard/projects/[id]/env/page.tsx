'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type EnvVar = { id: string; key: string; createdAt: string }

export default function ProjectEnvPage() {
  const { id } = useParams<{ id: string }>()
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const fetchEnvVars = useCallback(async () => {
    try {
      const { envVars } = await api.getProjectEnvVars(id)
      setEnvVars(envVars)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEnvVars()
  }, [fetchEnvVars])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newKey.trim()) return
    setSaveError('')
    setSaving(true)
    try {
      await api.addProjectEnvVar(id, newKey.trim(), newValue)
      setNewKey('')
      setNewValue('')
      await fetchEnvVars()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(key: string) {
    setDeletingKey(key)
    try {
      await api.deleteProjectEnvVar(id, key)
      setEnvVars((prev) => prev.filter((v) => v.key !== key))
    } catch {
      //
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">Environment Variables</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Changes take effect on the next deployment. Prefix with{' '}
          <code className="text-foreground/70">VITE_</code> to expose to your app.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : envVars.length === 0 ? (
        <p className="text-sm text-muted-foreground">No environment variables set.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {envVars.map((v, i) => (
            <div
              key={v.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${i !== envVars.length - 1 ? 'border-b border-border/60' : ''}`}
            >
              <code className="flex-1 text-xs font-mono text-foreground/80 truncate">{v.key}</code>
              <span className="text-xs text-muted-foreground/50 font-mono tracking-widest shrink-0">••••••</span>
              <button
                type="button"
                onClick={() => handleDelete(v.key)}
                disabled={deletingKey === v.key}
                className="text-muted-foreground/50 hover:text-destructive transition-colors text-lg leading-none pb-0.5 shrink-0 disabled:opacity-30"
                aria-label={`Delete ${v.key}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="env-key" className="text-xs">Key</Label>
            <Input
              id="env-key"
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="VITE_API_URL"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="env-value" className="text-xs">Value</Label>
            <Input
              id="env-value"
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="https://…"
              className="text-xs"
            />
          </div>
          <Button type="submit" size="sm" disabled={!newKey.trim() || saving} className="shrink-0 gap-2">
            {saving && (
              <span className="inline-block w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            )}
            Add
          </Button>
        </div>
        {saveError && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            {saveError}
          </p>
        )}
      </form>
    </div>
  )
}
