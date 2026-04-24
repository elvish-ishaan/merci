import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CtaButtonProps = {
  href: string
  variant?: 'brand' | 'brandOutline'
  children: ReactNode
  className?: string
}

const base =
  'inline-flex items-center gap-2 h-11 px-5 rounded-[8px] text-sm font-medium ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent'

const variants: Record<NonNullable<CtaButtonProps['variant']>, string> = {
  brand:
    'bg-brand-accent text-black ' +
    'transition-[background,box-shadow,transform] duration-200 ease-out ' +
    'hover:bg-brand-accent-hover hover:shadow-[0_0_24px_-4px_rgba(255,106,42,0.6)] ' +
    'active:translate-y-px',
  brandOutline:
    'border border-brand-border bg-transparent text-brand-fg ' +
    'transition-colors duration-200 ease-out ' +
    'hover:bg-brand-surface hover:border-brand-highlight hover:text-brand-fg-strong',
}

export function CtaButton({
  href,
  variant = 'brand',
  children,
  className,
}: CtaButtonProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  )
}
