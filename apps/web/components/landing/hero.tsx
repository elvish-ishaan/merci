import { ArrowPattern } from './arrow-pattern'
import { CtaButton } from './cta-button'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <ArrowPattern />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 md:grid-cols-12 md:py-32">
        <div className="md:col-span-7">
          <div className="mb-6 font-mono-brand text-sm text-brand-fg-muted">
            <span className="text-brand-accent">~/</span>mercy
          </div>
          <h1 className="font-mono-brand text-4xl leading-[1.1] tracking-tight text-brand-fg-strong sm:text-5xl md:text-6xl">
            Ship sites.
            <br />
            Run functions.
            <br />
            <span className="text-brand-fg-muted">Schedule everything.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-brand-fg-subtle md:text-lg">
            Mercy connects your repo, runs your code, and watches every run —
            without the yaml, the clusters, or the ops.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <CtaButton href="/register" variant="brand">
              Get started
            </CtaButton>
            <CtaButton href="/register" variant="brandOutline">
              Sign up for free <span aria-hidden>→</span>
            </CtaButton>
          </div>
        </div>
        <div className="hidden md:col-span-5 md:block" aria-hidden="true" />
      </div>
    </section>
  )
}
