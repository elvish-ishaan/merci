import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex items-center justify-center text-brand-fg-strong', className)}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="2.5"
          y="2.5"
          width="19"
          height="19"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M9 8l4 4-4 4"
          stroke="var(--color-brand-accent)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 16h3"
          stroke="var(--color-brand-accent)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
