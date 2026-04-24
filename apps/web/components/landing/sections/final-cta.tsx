import { CtaButton } from '@/components/landing/cta-button'

export function FinalCta() {
  return (
    <section id="cta" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 text-center md:py-28">
        <p className="font-mono-brand text-sm text-brand-accent">~/get started</p>
        <h2 className="mt-3 font-mono-brand text-3xl leading-tight tracking-tight text-brand-fg-strong md:text-4xl">
          Start shipping in minutes.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-brand-fg-subtle">
          Create an account, connect a repo, and watch your first deploy stream live.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CtaButton href="/register" variant="brand">
            Sign up for free
          </CtaButton>
          <CtaButton href="/register" variant="brandOutline">
            Get started →
          </CtaButton>
        </div>
      </div>
    </section>
  )
}
