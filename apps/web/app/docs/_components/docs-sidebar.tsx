'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  { label: 'Overview', href: '/docs' },
  { label: 'Deployments', href: '/docs/deployments' },
  { label: 'Mercio', href: '/docs/mercio' },
  { label: 'Mercob', href: '/docs/mercob' },
]

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Docs navigation"
      className="sticky top-20 self-start hidden md:block border-r border-brand-border pr-8 pb-12"
    >
      <p className="font-mono-brand text-xs text-brand-fg-muted mb-4">
        <span className="text-brand-accent">~/</span>docs
      </p>
      <ul className="space-y-1">
        {sections.map((s) => {
          const active = pathname === s.href
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                className={[
                  'block font-mono-brand text-sm py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent rounded',
                  active
                    ? 'text-brand-accent font-semibold'
                    : 'text-brand-fg-muted hover:text-brand-fg-strong',
                ].join(' ')}
              >
                {s.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
