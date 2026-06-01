'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ChevronLeft, LayoutGrid, ScrollText, KeyRound, Settings, Globe, BarChart2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '', label: 'Overview', icon: LayoutGrid },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/env', label: 'Environment', icon: KeyRound },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/domains', label: 'Domains', icon: Globe, soon: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, soon: true },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const [projectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    api.getProject(id)
      .then(({ project }) => setProjectName(project.projectName))
      .catch(() => {})
  }, [id])

  const base = `/dashboard/projects/${id}`

  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-border flex flex-col h-full overflow-y-auto">
        <div className="px-3 pt-4 pb-3 border-b border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Projects
          </Link>
          <p className="text-sm font-medium truncate text-foreground/90" title={projectName ?? ''}>
            {projectName ?? '—'}
          </p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
            const fullHref = `${base}${href}`
            const active = href === ''
              ? pathname === base
              : pathname.startsWith(fullHref)

            const className = cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              active
                ? 'bg-primary/10 text-primary font-medium'
                : soon
                ? 'text-muted-foreground/40 cursor-not-allowed select-none'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )

            const inner = (
              <>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {soon && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-border text-muted-foreground/60">
                    Soon
                  </Badge>
                )}
              </>
            )

            return soon ? (
              <span key={href} className={className}>{inner}</span>
            ) : (
              <Link key={href} href={fullHref} className={className}>{inner}</Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
