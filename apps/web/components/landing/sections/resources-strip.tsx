import Link from 'next/link'
import { BookOpen, Rss, GitBranch, Activity } from 'lucide-react'

const links = [
  { icon: <BookOpen className="h-4 w-4" />, label: 'Docs', href: '#docs' },
  { icon: <Rss className="h-4 w-4" />, label: 'Changelog', href: '#changelog' },
  { icon: <GitBranch className="h-4 w-4" />, label: 'GitHub', href: '#github' },
  { icon: <Activity className="h-4 w-4" />, label: 'Status', href: '#status' },
]

export function ResourcesStrip() {
  return (
    <div id="resources" className="border-b border-brand-border bg-brand-bg-elev">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-5">
        <p className="font-mono-brand text-xs text-brand-fg-muted">Resources</p>
        <div className="flex flex-wrap gap-6">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex items-center gap-2 text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
