import { CalendarClock, RefreshCw, History, FileText, PlayCircle, PauseCircle } from 'lucide-react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'
import { FeatureCard } from '@/components/landing/primitives/feature-card'
import { FeatureGrid } from '@/components/landing/primitives/feature-grid'
import { RunHistoryMock } from '@/components/landing/primitives/run-history-mock'

const features = [
  {
    icon: <CalendarClock className="h-4 w-4" />,
    title: 'Flexible schedules',
    body: 'Pick daily, weekly, every N minutes, a cron expression, or a one-time run — whichever fits your workflow.',
  },
  {
    icon: <RefreshCw className="h-4 w-4" />,
    title: 'Retries & timeouts',
    body: 'Decide how many times to retry on failure and how long to wait for a response.',
  },
  {
    icon: <History className="h-4 w-4" />,
    title: 'Full run history',
    body: 'See the outcome of every past execution — status, response, and timing — all in one place.',
  },
  {
    icon: <FileText className="h-4 w-4" />,
    title: 'Per-run logs',
    body: 'Every line your function outputs is captured and stored, so you always know what happened.',
  },
  {
    icon: <PlayCircle className="h-4 w-4" />,
    title: 'Manual trigger',
    body: 'Run a job right now from the dashboard — no need to wait for the next scheduled time.',
  },
  {
    icon: <PauseCircle className="h-4 w-4" />,
    title: 'Pause / resume',
    body: 'Disable a job temporarily without losing its schedule or run history.',
  },
]

export function Mercob() {
  return (
    <section id="mercob" className="border-b border-brand-border">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="~/mercob"
              heading="Set a schedule. Never miss a run."
              sub="Keep things running on autopilot. Set a schedule for any function and Mercy runs it, retries failures, and gives you a full record of every execution."
            />
            <FeatureGrid className="mt-10">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </FeatureGrid>
          </div>
          <div className="lg:pt-16" aria-hidden="true">
            <RunHistoryMock />
          </div>
        </div>
      </div>
    </section>
  )
}
