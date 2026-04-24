import { GitBranch, Zap, Clock } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { ProductCard } from '@/components/landing/primitives/product-card'

const products = [
  {
    icon: <GitBranch className="h-5 w-5" />,
    name: 'Deployments',
    pitch: 'Git push. Get a URL.',
    bullets: ['Live build logs', 'Auto SSL', 'Custom domains'] as const,
    href: '#deployments',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    name: 'Mercio',
    pitch: 'Upload a zip. Get a function.',
    bullets: ['Hono + Node handlers', 'V8 isolation', 'Warm pool'] as const,
    href: '#mercio',
  },
  {
    icon: <Clock className="h-5 w-5" />,
    name: 'Mercob',
    pitch: 'Cron for your functions.',
    bullets: ['Cron / daily / weekly / once', 'Retries & timeouts', 'Full run history'] as const,
    href: '#mercob',
  },
]

export function Pillars() {
  return (
    <section id="product" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="~/the platform"
          heading="Three tools. One control plane."
          sub="Deploy sites from GitHub, run serverless functions, and schedule recurring jobs — all from the same dashboard."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.name} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}
