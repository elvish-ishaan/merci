import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  heading: string
  sub?: string
  className?: string
  id?: string
}

export function SectionHeading({ eyebrow, heading, sub, className, id }: Props) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow && (
        <p className="mb-3 font-mono-brand text-sm text-brand-accent">{eyebrow}</p>
      )}
      <h2
        id={id}
        className="font-mono-brand text-3xl leading-tight tracking-tight text-brand-fg-strong md:text-4xl"
      >
        {heading}
      </h2>
      {sub && (
        <p className="mt-4 text-base text-brand-fg-subtle md:text-lg">{sub}</p>
      )}
    </div>
  )
}
