'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { actionsApi, type ActionSecret } from '@/lib/actions-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, KeyRound, Trash2 } from 'lucide-react'

export default function SecretsPage() {
  const { repoId } = useParams<{ repoId: string }>()
  const router = useRouter()
  const [secrets, setSecrets] = useState<ActionSecret[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSecrets = useCallback(async () => {
    try {
      const d = await actionsApi.getSecrets(repoId)
      setSecrets(d.secrets)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [repoId])

  useEffect(() => { fetchSecrets() }, [fetchSecrets])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim().toUpperCase()
    const trimmedValue = value.trim()
    if (!trimmedName || !trimmedValue) return

    setSaving(true)
    setError(null)
    try {
      await actionsApi.upsertSecret(repoId, trimmedName, trimmedValue)
      setName('')
      setValue('')
      await fetchSecrets()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save secret')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(secretName: string) {
    if (!confirm(`Delete secret "${secretName}"?`)) return
    setDeleting(secretName)
    try {
      await actionsApi.deleteSecret(repoId, secretName)
      setSecrets((prev) => prev.filter((s) => s.name !== secretName))
    } catch (err: any) {
      alert(err?.message ?? 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-0.5 p-1 h-auto"
          onClick={() => router.push(`/dashboard/actions/${repoId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Secrets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Secrets are encrypted and injected as environment variables at runtime
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 border border-border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-medium">Add or update secret</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="secret-name">Name</Label>
            <Input
              id="secret-name"
              placeholder="MY_SECRET"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              className="font-mono"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secret-value">Value</Label>
            <Input
              id="secret-value"
              type="password"
              placeholder="••••••••"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" disabled={saving || !name.trim() || !value.trim()}>
            {saving ? 'Saving…' : 'Save secret'}
          </Button>
        </div>
      </form>

      <h2 className="text-sm font-semibold text-foreground/80 mb-3">
        Stored secrets ({secrets.length})
      </h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : secrets.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <KeyRound className="w-7 h-7 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No secrets yet. Add one above.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {secrets.map((secret) => (
            <div key={secret.id} className="p-4 flex items-center gap-3">
              <KeyRound className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium">{secret.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {new Date(secret.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0 shrink-0"
                disabled={deleting === secret.name}
                onClick={() => handleDelete(secret.name)}
                title="Delete secret"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
