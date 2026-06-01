'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api.getProject(id)
      .then(({ project }) => {
        setProjectName(project.projectName)
        setOriginalName(project.projectName)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!projectName.trim() || projectName === originalName) return
    setSaveError('')
    setSaving(true)
    try {
      await api.updateProject(id, { projectName: projectName.trim() })
      setOriginalName(projectName.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleteError('')
    setDeleting(true)
    try {
      await api.deleteProject(id)
      router.replace('/dashboard')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-semibold">General</h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value); setSaved(false) }}
              placeholder="my-app"
              className="max-w-xs"
            />
          </div>
          {saveError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={!projectName.trim() || projectName === originalName || saving}
              className="gap-2"
            >
              {saving && (
                <span className="inline-block w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              )}
              Save
            </Button>
            {saved && <span className="text-xs text-emerald-400">Saved</span>}
          </div>
        </form>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Deleting this project is irreversible. All build logs and environment variables will be removed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          Delete project
        </Button>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{originalName}</strong> along with all its build logs and environment variables. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && (
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {deleting ? 'Deleting…' : 'Delete project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
