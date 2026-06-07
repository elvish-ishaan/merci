import { Bot, Shield, Code2, Key, Gauge, Layers } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { FeatureCard } from '@/components/landing/primitives/feature-card'
import { FeatureGrid } from '@/components/landing/primitives/feature-grid'
import { SandboxMock } from '@/components/landing/primitives/sandbox-mock'

const features = [
  {
    icon: <Bot className="h-4 w-4" />,
    title: 'Works with your AI assistant',
    body: 'Connect Claude Code, Claude Desktop, or any compatible AI assistant. Generated code runs instantly in a safe environment.',
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: 'Fully isolated execution',
    body: 'Every run is completely cut off from the internet and from the rest of your infrastructure. What runs in the sandbox stays in the sandbox.',
  },
  {
    icon: <Code2 className="h-4 w-4" />,
    title: 'JavaScript and TypeScript',
    body: 'Run JavaScript or TypeScript files with no setup. No configuration, no compilation — just paste the code and go.',
  },
  {
    icon: <Key className="h-4 w-4" />,
    title: 'Simple key management',
    body: 'Create and revoke access keys from the dashboard. Each key is scoped so you stay in control of who can execute code.',
  },
  {
    icon: <Gauge className="h-4 w-4" />,
    title: 'Fair resource limits per run',
    body: 'Every execution is capped on memory and compute so one runaway script cannot affect anything else on the platform.',
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: 'For AI tools and your own apps',
    body: 'AI assistants connect through one path; your own applications integrate through another. Same secure sandbox, same guarantees.',
  },
]

export function MerciSandbox() {
  return (
    <section id="merci-sandbox" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1 lg:pt-16" aria-hidden="true">
            <SandboxMock />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="~/merci-sandbox"
              heading="Safe code execution for AI."
              sub="Give your AI assistant a safe place to run code. Every execution is isolated, resource-limited, and cleaned up automatically — no risk to your infrastructure."
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
