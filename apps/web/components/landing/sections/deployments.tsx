import { Activity, Lock, Globe, GitBranch, Box, Radio } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { FeatureCard } from '@/components/landing/primitives/feature-card'
import { FeatureGrid } from '@/components/landing/primitives/feature-grid'
import { TerminalMock } from '@/components/landing/primitives/terminal-mock'

const features = [
  {
    icon: <Activity className="h-4 w-4" />,
    title: 'Live build logs',
    body: 'Watch your build progress in real time, straight from the dashboard. Reconnect at any point and pick up right where you left off.',
  },
  {
    icon: <Lock className="h-4 w-4" />,
    title: 'Secure env vars',
    body: 'Add environment variables through the dashboard. Mercy keeps them safe and injects them only when needed.',
  },
  {
    icon: <Globe className="h-4 w-4" />,
    title: 'Custom domains + auto HTTPS',
    body: 'Bring your own domain. Mercy provisions the HTTPS certificate automatically — no manual steps.',
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: 'Private repos',
    body: 'Connect private GitHub repositories with a single authorization. No extra setup.',
  },
  {
    icon: <Box className="h-4 w-4" />,
    title: 'Zero-config builds',
    body: 'No Dockerfiles or build scripts to write. Mercy detects your project and gets to work.',
  },
  {
    icon: <Radio className="h-4 w-4" />,
    title: 'Real-time status',
    body: 'Track every stage of your deployment — from the moment you push to the moment it goes live.',
  },
]

export function Deployments() {
  return (
    <section id="deployments" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="~/deployments"
              heading="Push to GitHub. Go live."
              sub="Connect a repo, add your env vars, and Mercy takes it from there. Your app lands on a secure URL — with live progress you can follow from start to finish."
            />
            <FeatureGrid className="mt-10">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </FeatureGrid>
          </div>
          <div className="lg:pt-16" aria-hidden="true">
            <TerminalMock />
          </div>
        </div>
      </div>
    </section>
  )
}
