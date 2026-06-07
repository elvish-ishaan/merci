import { GitBranch, Zap, Clock, GitPullRequest, Bot } from 'lucide-react'
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
    pitch: 'Upload a file. Get an endpoint.',
    bullets: ['Any framework or style', 'Isolated per request', 'Always-on endpoints'] as const,
    href: '#mercio',
  },
  {
    icon: <Clock className="h-5 w-5" />,
    name: 'Mercob',
    pitch: 'Automate your functions.',
    bullets: ['Flexible schedules', 'Retry on failure', 'Full run history'] as const,
    href: '#mercob',
  },
  {
    icon: <GitPullRequest className="h-5 w-5" />,
    name: 'Merci Actions',
    pitch: 'Push code. Run CI.',
    bullets: ['Works with existing workflows', 'Live build logs', 'Clean run every time'] as const,
    href: '#merci-actions',
  },
  {
    icon: <Bot className="h-5 w-5" />,
    name: 'Merci Sandbox',
    pitch: 'Run AI code. Safely.',
    bullets: ['Works with AI assistants', 'Fully isolated runs', 'JavaScript & TypeScript'] as const,
    href: '#merci-sandbox',
  },
]

export function Pillars() {
  return (
    <section id="product" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <SectionHeading
          eyebrow="~/the platform"
          heading="Develop with your favorite tools. Launch globally, instantly."
          sub="Deploy sites, run serverless functions, automate jobs, run CI workflows, and execute AI-generated code — all from one place."
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
