'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'mercy_announce_dismissed'

export function AnnouncementBar() {
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1')
    setHydrated(true)
  }, [])

  if (!hydrated || dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative h-8 border-b border-brand-border bg-brand-bg-elev"
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 font-mono-brand text-xs text-brand-fg-muted">
        <span className="truncate">
          <span className="font-semibold text-brand-accent">#LAUNCHED</span>
          &nbsp;Mercy v1 is live — explore the changelog.
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
