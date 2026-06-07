import { Radio, Lock, RotateCcw, Boxes, GitPullRequest, Activity } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { FeatureCard } from '@/components/landing/primitives/feature-card'
import { FeatureGrid } from '@/components/landing/primitives/feature-grid'
import { CiLogMock } from '@/components/landing/primitives/ci-log-mock'

const features = [
  {
    icon: <GitPullRequest className="h-4 w-4" />,
    title: 'Works with your existing workflows',
    body: 'Bring your existing workflow files — no changes needed. Popular community actions work just as they would anywhere else.',
  },
  {
    icon: <Radio className="h-4 w-4" />,
    title: 'Live build logs',
    body: 'Every log line appears in the dashboard instantly. Follow your build from start to finish without ever refreshing the page.',
  },
  {
    icon: <Boxes className="h-4 w-4" />,
    title: 'Clean environment every run',
    body: 'Each job gets a fresh, isolated environment created just for that run and discarded when it finishes. No bleed between builds.',
  },
  {
    icon: <Lock className="h-4 w-4" />,
    title: 'Per-repo secrets',
    body: 'Add secrets to each repository from the dashboard. They are stored securely and only made available during a run.',
  },
  {
    icon: <RotateCcw className="h-4 w-4" />,
    title: 'Re-run any workflow',
    body: 'Trigger a re-run of any past workflow from the dashboard — no need to push a new commit to try again.',
  },
  {
    icon: <Activity className="h-4 w-4" />,
    title: 'Live job status',
    body: 'See every job update in real time — queued, running, passed, or failed — with per-step timing at a glance.',
  },
]

export function MerciActions() {
  return (
    <section id="merci-actions" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="~/merci-actions"
              heading="Push code. Run CI."
              sub="CI that runs automatically when you push. Connect a repo, keep your workflow files, and watch every step stream live — no separate CI service to manage."
            />
            <FeatureGrid className="mt-10">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </FeatureGrid>
          </div>
          <div className="lg:pt-16" aria-hidden="true">
            <CiLogMock />
          </div>
        </div>
      </div>
    </section>
  )
}
