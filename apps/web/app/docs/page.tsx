import type { Metadata } from 'next'
import Link from 'next/link'
import { GitBranch, Zap, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation — Mercy',
  description:
    'Learn how to deploy static sites, run serverless functions, and schedule jobs with Mercy. Full guides for Deployments, Mercio, and Mercob.',
}

const services = [
  {
    icon: <GitBranch className="h-5 w-5 text-brand-accent" />,
    name: 'Deployments',
    slug: 'deployments',
    desc: 'Connect a GitHub repo and go live in seconds. Docker-powered builds, real-time log streaming, custom domains, and auto HTTPS — all included.',
    topics: ['How it works', 'Quickstart', 'Environment variables', 'Custom domains'],
  },
  {
    icon: <Zap className="h-5 w-5 text-brand-accent" />,
    name: 'Mercio',
    slug: 'mercio',
    desc: 'Upload a JavaScript or TypeScript file and get a public invoke URL. V8-isolated execution via workerd — no servers, no config.',
    topics: ['How it works', 'Quickstart', 'Handler contract', 'Hono support', 'Configuration'],
  },
  {
    icon: <Clock className="h-5 w-5 text-brand-accent" />,
    name: 'Mercob',
    slug: 'mercob',
    desc: 'Schedule any Mercio function on a cron, daily, weekly, or interval cadence. Full retry control, timeout handling, and per-run log history.',
    topics: ['How it works', 'Quickstart', 'Schedule kinds', 'Retries & timeouts', 'Run history'],
  },
]

export default function DocsPage() {
  return (
    <div>
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <span className="text-brand-accent">~/</span>docs
      </p>
      <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
        Documentation
      </h1>
      <p className="mt-4 text-base text-brand-fg-subtle max-w-2xl">
        Everything you need to deploy sites, run serverless functions, and schedule jobs on Mercy. Pick a service below to get started.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-1 lg:grid-cols-1">
        {services.map((s) => (
          <Link
            key={s.slug}
            href={`/docs/${s.slug}`}
            className="group block bg-brand-surface border border-brand-border rounded-lg p-6 transition-colors hover:border-brand-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <div className="flex items-center gap-3 mb-3">
              {s.icon}
              <span className="font-mono-brand text-lg text-brand-fg-strong group-hover:text-brand-accent transition-colors">
                {s.name}
              </span>
            </div>
            <p className="text-sm text-brand-fg-subtle mb-4">{s.desc}</p>
            <ul className="flex flex-wrap gap-2">
              {s.topics.map((t) => (
                <li
                  key={t}
                  className="font-mono-brand text-xs text-brand-fg-muted bg-brand-surface-2 border border-brand-border rounded px-2 py-0.5"
                >
                  {t}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  )
}
