import { CheckCircle2 } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'

const included = [
  'Unlimited deployments',
  'Serverless functions (Mercio)',
  'Scheduled jobs (Mercob)',
  'Custom domains + auto TLS',
  'Real-time build logs',
  'Encrypted env vars',
]

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="~/pricing"
          heading="Self-hosted. Free forever."
          sub="Run Mercy on your own infrastructure with a single docker-compose up. Managed cloud plans are coming."
          className="mx-auto text-center"
        />
        <div className="mx-auto mt-12 max-w-md">
          <div className="rounded-lg border border-brand-border bg-brand-surface p-8">
            <div className="flex items-baseline gap-2">
              <span className="font-mono-brand text-5xl font-bold text-brand-fg-strong">$0</span>
              <span className="text-sm text-brand-fg-muted">/ self-hosted</span>
            </div>
            <p className="mt-2 text-sm text-brand-fg-subtle">
              Everything included. Your infra, your data, your rules.
            </p>
            <ul className="mt-8 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-brand-fg">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-md border border-brand-border bg-brand-surface-2 px-4 py-3">
              <p className="font-mono-brand text-xs text-brand-fg-muted">
                <span className="text-brand-accent">Coming soon</span> — managed cloud plans with zero-setup hosting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
