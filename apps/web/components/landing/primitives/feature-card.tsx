import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  icon: ReactNode
  title: string
  body: string
  className?: string
}

export function FeatureCard({ icon, title, body, className }: Props) {
  return (
    <div className={cn('flex gap-4', className)}>
      <div className="mt-0.5 shrink-0 text-brand-accent">{icon}</div>
      <div>
        <p className="font-mono-brand text-sm font-semibold text-brand-fg-strong">{title}</p>
        <p className="mt-1 text-sm text-brand-fg-subtle">{body}</p>
      </div>
    </div>
  )
}
