import { Server, Cpu, Terminal } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'

const cards = [
  {
    icon: <Server className="h-5 w-5" />,
    title: 'Self-host in one compose',
    body: 'A single `docker-compose up` gets you the full stack — API, worker, runtime, scheduler, and reverse proxy. Your infra. Your data.',
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    title: 'Built on boring tech',
    body: 'Postgres, Redis, Docker, Caddy, Bun, workerd. No proprietary magic — swap any piece when you need to.',
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "Everything's an API",
    body: 'The dashboard uses the same Express endpoints you do. Automate deployments, trigger jobs, query runs — all via HTTP.',
  },
]

export function DxStrip() {
  return (
    <section id="solutions" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="~/built for developers"
          heading="No magic. No lock-in."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-brand-border bg-brand-surface p-6 transition-colors hover:border-brand-highlight"
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-brand-border bg-brand-surface-2 text-brand-accent">
                {card.icon}
              </div>
              <p className="font-mono-brand text-sm font-semibold text-brand-fg-strong">{card.title}</p>
              <p className="mt-2 text-sm text-brand-fg-subtle">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
