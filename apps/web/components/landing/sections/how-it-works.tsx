import { SectionHeading } from '@/components/landing/primitives/section-heading'

const steps = [
  {
    num: '01',
    title: 'Connect',
    body: 'Paste a GitHub URL. Private repos? Connect GitHub once via OAuth.',
  },
  {
    num: '02',
    title: 'Configure',
    body: 'Name the project, add env vars, pick a subdomain or bring your own domain.',
  },
  {
    num: '03',
    title: 'Build',
    body: 'A Docker container boots, runs your build, and streams every log line to your browser.',
  },
  {
    num: '04',
    title: 'Ship',
    body: 'Your app is live on HTTPS. Auto-provisioned TLS, no DNS gymnastics.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="~/how it works"
          heading="From repo to live in four steps."
          sub="No infrastructure knowledge required. Mercy handles the ops."
          className="mx-auto text-center"
        />
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="absolute top-6 left-full hidden h-px w-full -translate-x-4 bg-brand-border lg:block"
                  aria-hidden="true"
                />
              )}
              <p className="font-mono-brand text-4xl font-bold text-brand-accent/20">{step.num}</p>
              <p className="mt-3 font-mono-brand text-base font-semibold text-brand-fg-strong">
                {step.title}
              </p>
              <p className="mt-2 text-sm text-brand-fg-subtle">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
