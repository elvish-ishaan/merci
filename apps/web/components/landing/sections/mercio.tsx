import { Code2, Link2, Flame, Shield, Package, Radio } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { FeatureCard } from '@/components/landing/primitives/feature-card'
import { FeatureGrid } from '@/components/landing/primitives/feature-grid'
import { CodeMock } from '@/components/landing/primitives/code-mock'

const features = [
  {
    icon: <Code2 className="h-4 w-4" />,
    title: 'Write how you want',
    body: 'Use a simple function or bring in a full Hono app for routing and middleware — either style works out of the box.',
  },
  {
    icon: <Link2 className="h-4 w-4" />,
    title: 'Instant public URL',
    body: 'Every function gets its own live endpoint the moment it deploys. Share it, hit it, automate it.',
  },
  {
    icon: <Flame className="h-4 w-4" />,
    title: 'Fast responses',
    body: 'Functions stay ready so the first request doesn\'t feel slow. Active endpoints respond without noticeable delay.',
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: 'Complete isolation',
    body: 'Every function runs in its own sandbox. What happens in one deployment can\'t affect another.',
  },
  {
    icon: <Package className="h-4 w-4" />,
    title: 'Use any npm package',
    body: 'Import whatever libraries you need. Mercy bundles everything into a single deployable file.',
  },
  {
    icon: <Radio className="h-4 w-4" />,
    title: 'Live deploy status',
    body: 'Watch your function go from uploaded to live, step by step, in the dashboard.',
  },
]

export function Mercio() {
  return (
    <section id="mercio" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1 lg:pt-16" aria-hidden="true">
            <CodeMock />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="~/mercio"
              heading="Upload a function. Get a URL."
              sub="Turn any JavaScript file into a live API endpoint. Drop in your code and Mercy handles the rest — no servers to manage, no infrastructure to configure."
            />
            <FeatureGrid className="mt-10">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </FeatureGrid>
          </div>
        </div>
      </div>
    </section>
  )
}
