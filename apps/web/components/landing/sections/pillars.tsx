import type { ComponentType } from 'react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'

function MercobVisual() {
  const runs: { time: string; ok: boolean; duration: string }[] = [
    { time: 'Today  06:00', ok: true,  duration: '0.3s' },
    { time: 'Today  00:00', ok: true,  duration: '0.4s' },
    { time: 'Yest.  18:00', ok: true,  duration: '0.3s' },
    { time: 'Yest.  12:00', ok: false, duration: 'timeout' },
    { time: 'Yest.  06:00', ok: true,  duration: '0.2s' },
  ]

  return (
    <div className="flex flex-1 flex-col justify-center py-8" aria-hidden="true">
      <div className="mb-4 flex items-center gap-2">
        <span className="font-mono-brand text-[10px] text-brand-fg-muted">SCHEDULE</span>
        <code className="rounded border border-brand-border bg-brand-surface-2 px-2 py-0.5 font-mono-brand text-[11px] text-brand-fg">
          0 */6 * * *
        </code>
      </div>
      <div className="mb-3 h-px bg-brand-border" />
      <div className="space-y-2.5">
        {runs.map((run) => (
          <div key={run.time} className="flex items-center gap-3">
            <span
              className={
                run.ok
                  ? 'font-mono-brand text-xs text-brand-accent'
                  : 'font-mono-brand text-xs text-brand-fg-muted opacity-40'
              }
            >
              {run.ok ? '✓' : '✗'}
            </span>
            <span className="font-mono-brand text-[11px] text-brand-fg-muted">{run.time}</span>
            <span
              className={
                run.ok
                  ? 'ml-auto font-mono-brand text-[10px] text-brand-fg-muted'
                  : 'ml-auto font-mono-brand text-[10px] text-brand-fg-muted opacity-40'
              }
            >
              {run.duration}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SandboxVisual() {
  return (
    <div className="flex flex-1 items-end pb-8 pt-10" aria-hidden="true">
      <div className="w-full overflow-hidden rounded-lg border border-brand-border bg-brand-bg-elev">
        <div className="flex items-center justify-between border-b border-brand-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-border" />
            <span className="h-2 w-2 rounded-full bg-brand-border" />
            <span className="h-2 w-2 rounded-full bg-brand-border" />
            <span className="ml-2 font-mono-brand text-[10px] text-brand-fg-muted">merci-sandbox</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
            <span className="font-mono-brand text-[9px] text-brand-accent">isolated</span>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 space-y-1 p-4 font-mono-brand text-[11px]">
            <p className="mb-2 text-brand-fg-muted">{'// AI-generated code'}</p>
            <p className="text-brand-fg-muted">
              <span className="text-brand-fg">const</span> resp{' '}
              <span className="text-brand-fg-muted">=</span>{' '}
              <span className="text-brand-fg">await</span> fetch(url)
            </p>
            <p className="text-brand-fg-muted">
              <span className="text-brand-fg">const</span> data{' '}
              <span className="text-brand-fg-muted">=</span> await resp.json()
            </p>
            <p className="text-brand-fg-muted">
              <span className="text-brand-fg">return</span> data.items.length
            </p>
          </div>
          <div className="w-px bg-brand-border lg:block hidden" />
          <div className="flex-1 border-t border-brand-border p-4 font-mono-brand text-[11px] lg:border-t-0">
            <p className="mb-2 text-brand-fg-muted">{'→ output'}</p>
            <p className="text-brand-fg-strong">42</p>
            <div className="mt-3 space-y-1">
              <p className="text-brand-accent">✓ Executed in 48ms</p>
              <p className="text-brand-accent">✓ JS / TS supported</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeployVisual() {
  return (
    <div className="flex flex-1 items-end justify-center pb-8 pt-10" aria-hidden="true">
      <div className="w-full max-w-[280px] overflow-hidden rounded-lg border border-brand-border bg-brand-bg-elev">
        <div className="flex items-center gap-1.5 border-b border-brand-border px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-brand-border" />
          <span className="h-2 w-2 rounded-full bg-brand-border" />
          <span className="h-2 w-2 rounded-full bg-brand-border" />
          <span className="ml-2 font-mono-brand text-[10px] text-brand-fg-muted">terminal</span>
        </div>
        <div className="space-y-1.5 p-4 font-mono-brand text-[11px]">
          <p className="text-brand-fg-muted">
            <span className="text-brand-accent">$</span> git push origin main
          </p>
          <p className="text-brand-fg-muted">Compressing objects: 100%</p>
          <p className="text-brand-fg-muted">Writing objects: 100%</p>
          <div className="mt-3 space-y-1.5">
            <p className="text-brand-accent">✓ Build complete · 8.2s</p>
            <p className="text-brand-accent">✓ SSL provisioned</p>
            <p className="mt-1 text-brand-fg-muted">
              {'→ '}<span className="text-brand-fg-strong">your-app.mercy.dev</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MercioVisual() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10" aria-hidden="true">
      <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-surface-2 px-5 py-3">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-brand-fg-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="font-mono-brand text-sm text-brand-fg">handler.ts</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="h-6 w-px bg-brand-border" />
        <span className="rounded-full border border-brand-border px-2 py-0.5 font-mono-brand text-[10px] text-brand-fg-muted">
          mercio deploy
        </span>
        <div className="h-6 w-px bg-brand-border" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full border border-brand-accent bg-brand-accent/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
          <span className="font-mono-brand text-xs text-brand-accent">POST /api/handler</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-brand-accent bg-brand-accent/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
          <span className="font-mono-brand text-xs text-brand-accent">GET /api/handler</span>
        </div>
      </div>
    </div>
  )
}

function ActionsVisual() {
  const stages: { label: string; status: 'done' | 'running' | 'pending'; duration?: string }[] = [
    { label: 'CHECKOUT', status: 'done', duration: '0.8s' },
    { label: 'INSTALL', status: 'done', duration: '12.4s' },
    { label: 'BUILD', status: 'running' },
    { label: 'TEST', status: 'pending' },
    { label: 'DEPLOY', status: 'pending' },
  ]

  return (
    <div className="flex flex-1 flex-col justify-center gap-3 px-2 py-10" aria-hidden="true">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-3">
          {i > 0 && (
            <div className="absolute ml-2 -mt-5 h-3 w-px bg-brand-border" />
          )}
          <div
            className={
              stage.status === 'done'
                ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-accent bg-brand-accent/20'
                : stage.status === 'running'
                  ? 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-fg-muted bg-brand-surface-2'
                  : 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface-2'
            }
          >
            {stage.status === 'done' && (
              <span className="text-[8px] font-bold leading-none text-brand-accent">✓</span>
            )}
            {stage.status === 'running' && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-fg-muted" />
            )}
          </div>

          <span
            className={
              stage.status === 'done'
                ? 'font-mono-brand text-xs text-brand-fg'
                : stage.status === 'running'
                  ? 'font-mono-brand text-xs text-brand-fg-strong'
                  : 'font-mono-brand text-xs text-brand-fg-muted'
            }
          >
            {stage.label}
          </span>

          <span className="ml-auto font-mono-brand text-[10px] text-brand-fg-muted">
            {stage.status === 'done' && stage.duration}
            {stage.status === 'running' && 'running…'}
          </span>
        </div>
      ))}
    </div>
  )
}

type Pillar = {
  heading: string
  description: string
  Visual: ComponentType
  className?: string
}

const pillars: Pillar[] = [
  {
    heading: 'Git push. Ship globally.',
    description:
      'Every push triggers a build. Your site goes live with SSL and custom domains in seconds — no config needed.',
    Visual: DeployVisual,
  },
  {
    heading: 'One file. One endpoint.',
    description:
      'Drop in a function file. Mercio wraps it in an isolated runtime and hands you an always-on serverless endpoint.',
    Visual: MercioVisual,
  },
  {
    heading: 'Push code. Run CI.',
    description:
      'Your existing GitHub workflows run in clean, isolated environments with live build logs on every push.',
    Visual: ActionsVisual,
  },
  {
    heading: 'Set a schedule. Forget the rest.',
    description:
      'Define a cron expression. Mercob fires your function on time, retries on failure, and keeps a full run history.',
    Visual: MercobVisual,
  },
  {
    heading: 'Run AI code. Safely.',
    description:
      'Execute AI-generated JavaScript and TypeScript in a fully isolated sandbox — zero risk to your infrastructure.',
    Visual: SandboxVisual,
    className: 'lg:col-span-2',
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
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-brand-border bg-brand-border sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ heading, description, Visual, className }) => (
            <div
              key={heading}
              className={`flex min-h-[460px] flex-col bg-brand-surface p-8${className ? ` ${className}` : ''}`}
            >
              <h3 className="font-mono-brand text-lg font-semibold leading-snug text-brand-fg-strong">
                {heading}
              </h3>
              <p className="mt-3 text-sm text-brand-fg-subtle">{description}</p>
              <Visual />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
