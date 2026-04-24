import type { ReactNode } from 'react'
import Link from 'next/link'

type Props = {
  icon: ReactNode
  name: string
  pitch: string
  bullets: readonly string[]
  href: string
}

export function ProductCard({ icon, name, pitch, bullets, href }: Props) {
  return (
    <div className="flex flex-col rounded-lg border border-brand-border bg-brand-surface p-6 transition-colors hover:border-brand-highlight">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-border bg-brand-surface-2 text-brand-accent">
        {icon}
      </div>
      <p className="font-mono-brand text-base font-semibold text-brand-fg-strong">{name}</p>
      <p className="mt-2 text-sm text-brand-fg-subtle">{pitch}</p>
      <ul className="mt-4 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-brand-fg-muted">
            <span className="text-brand-accent" aria-hidden>·</span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-6 font-mono-brand text-xs text-brand-accent transition-colors hover:text-brand-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        Learn more →
      </Link>
    </div>
  )
}
