import type { ComponentType } from 'react'
import { SectionHeading } from '@/components/landing/primitives/section-heading'

function GlobeVisual() {
  return (
    <div className="flex flex-1 items-center justify-center py-6" aria-hidden="true">
      <svg viewBox="0 0 280 280" className="w-full max-w-[300px]" fill="none">
        <circle cx="140" cy="140" r="100" stroke="#222222" strokeWidth="1.5" fill="#0A0A0A" />
        {/* Latitude lines */}
        <ellipse cx="140" cy="140" rx="100" ry="28" stroke="#222222" strokeWidth="1" />
        <ellipse cx="140" cy="100" rx="84" ry="22" stroke="#222222" strokeWidth="1" />
        <ellipse cx="140" cy="180" rx="84" ry="22" stroke="#222222" strokeWidth="1" />
        {/* Longitude arcs */}
        <path d="M140 40 C182 67 182 213 140 240" stroke="#222222" strokeWidth="1" />
        <path d="M140 40 C98 67 98 213 140 240" stroke="#222222" strokeWidth="1" />
        {/* Glow halos */}
        <circle cx="96"  cy="123" r="15" fill="#FF6A2A" opacity="0.12" />
        <circle cx="193" cy="131" r="15" fill="#FF6A2A" opacity="0.12" />
        <circle cx="140" cy="187" r="15" fill="#FF6A2A" opacity="0.12" />
        <circle cx="165" cy="95"  r="15" fill="#FF6A2A" opacity="0.12" />
        {/* Server nodes */}
        <circle cx="96"  cy="123" r="7" fill="#FF6A2A" />
        <circle cx="193" cy="131" r="7" fill="#FF6A2A" />
        <circle cx="140" cy="187" r="7" fill="#FF6A2A" />
        <circle cx="165" cy="95"  r="7" fill="#FF6A2A" />
        {/* Connection lines */}
        <line x1="96"  y1="123" x2="193" y2="131" stroke="#FF6A2A" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
        <line x1="193" y1="131" x2="140" y2="187" stroke="#FF6A2A" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
        <line x1="96"  y1="123" x2="165" y2="95"  stroke="#FF6A2A" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
        <line x1="165" y1="95"  x2="193" y2="131" stroke="#FF6A2A" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.5" />
      </svg>
    </div>
  )
}

function FunctionVisual() {
  return (
    <div className="flex flex-1 items-center justify-center py-6" aria-hidden="true">
      <svg viewBox="0 0 280 280" className="w-full max-w-[300px]" fill="none">
        {/* Incoming request node */}
        <circle cx="38" cy="140" r="20" stroke="#222222" strokeWidth="1.5" fill="#111111" />
        <text x="38" y="144" textAnchor="middle" fill="#A1A1A1" fontSize="10" fontFamily="monospace">req</text>
        {/* Arrow to function */}
        <line x1="58" y1="140" x2="90" y2="140" stroke="#A1A1A1" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M86 134 L94 140 L86 146" stroke="#A1A1A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Function glow + ring */}
        <circle cx="140" cy="140" r="44" fill="#FF6A2A" opacity="0.05" />
        <circle cx="140" cy="140" r="34" stroke="#FF6A2A" strokeWidth="1.5" fill="#0A0A0A" />
        <text x="140" y="150" textAnchor="middle" fill="#FF6A2A" fontSize="28" fontFamily="monospace">λ</text>
        {/* Arrows out */}
        <line x1="174" y1="124" x2="208" y2="94"  stroke="#A1A1A1" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="174" y1="140" x2="208" y2="140" stroke="#A1A1A1" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="174" y1="156" x2="208" y2="186" stroke="#A1A1A1" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Response nodes */}
        <circle cx="226" cy="94"  r="17" stroke="#FF6A2A" strokeWidth="1.5" fill="#111111" />
        <text x="226" y="98"  textAnchor="middle" fill="#FF6A2A" fontSize="10" fontFamily="monospace">200</text>
        <circle cx="226" cy="140" r="17" stroke="#222222" strokeWidth="1.5" fill="#111111" />
        <text x="226" y="144" textAnchor="middle" fill="#A1A1A1" fontSize="10" fontFamily="monospace">201</text>
        <circle cx="226" cy="186" r="17" stroke="#222222" strokeWidth="1.5" fill="#111111" />
        <text x="226" y="190" textAnchor="middle" fill="#A1A1A1" fontSize="10" fontFamily="monospace">404</text>
        {/* Label */}
        <text x="140" y="222" textAnchor="middle" fill="#A1A1A1" fontSize="12" fontFamily="monospace">handler.ts</text>
      </svg>
    </div>
  )
}

function PipelineVisual() {
  const stages: { label: string; status: 'done' | 'running' | 'pending' }[] = [
    { label: 'checkout', status: 'done' },
    { label: 'install',  status: 'done' },
    { label: 'build',    status: 'running' },
    { label: 'test',     status: 'pending' },
    { label: 'deploy',   status: 'pending' },
  ]

  return (
    <div className="flex flex-1 items-center justify-center py-6" aria-hidden="true">
      <svg viewBox="0 0 300 160" className="w-full max-w-[360px]" fill="none">
        {stages.map((stage, i) => {
          const x = 30 + i * 60
          const y = 70
          const done    = stage.status === 'done'
          const running = stage.status === 'running'
          return (
            <g key={stage.label}>
              {i > 0 && (
                <line
                  x1={x - 44} y1={y}
                  x2={x - 16} y2={y}
                  stroke={stages[i - 1].status === 'done' ? '#FF6A2A' : '#222222'}
                  strokeWidth="2"
                />
              )}
              {(done || running) && <circle cx={x} cy={y} r="24" fill="#FF6A2A" opacity="0.08" />}
              <circle
                cx={x} cy={y} r="16"
                fill={done ? '#FF6A2A' : '#0A0A0A'}
                stroke={done || running ? '#FF6A2A' : '#222222'}
                strokeWidth="1.5"
              />
              {done && (
                <path
                  d={`M${x - 7} ${y + 1} L${x - 2} ${y + 7} L${x + 7} ${y - 6}`}
                  stroke="#000"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {running && <circle cx={x} cy={y} r="5.5" fill="#FF6A2A" />}
              <text
                x={x} y={y + 34}
                textAnchor="middle"
                fill="#A1A1A1"
                fontSize="10"
                fontFamily="monospace"
              >
                {stage.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ClockVisual() {
  const cx = 140
  const cy = 140
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180)
    const r1 = 82
    const r2 = i % 3 === 0 ? 96 : 90
    return {
      x1: cx + r1 * Math.cos(angle),
      y1: cy + r1 * Math.sin(angle),
      x2: cx + r2 * Math.cos(angle),
      y2: cy + r2 * Math.sin(angle),
      major: i % 3 === 0,
    }
  })

  return (
    <div className="flex flex-1 items-center justify-center py-6" aria-hidden="true">
      <svg viewBox="0 0 280 280" className="w-full max-w-[300px]" fill="none">
        {/* Outer orbit ring */}
        <circle cx={cx} cy={cy} r="118" stroke="#FF6A2A" strokeWidth="1" strokeDasharray="6 5" opacity="0.25" />
        {/* Orbit arrow head at top */}
        <path d={`M${cx} 22 L${cx + 9} 32 M${cx} 22 L${cx - 9} 32`} stroke="#FF6A2A" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        {/* Clock face */}
        <circle cx={cx} cy={cy} r="100" stroke="#222222" strokeWidth="1.5" fill="#0A0A0A" />
        {/* Ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke={t.major ? '#EAEAEA' : '#333333'}
            strokeWidth={t.major ? 2.5 : 1.5}
            strokeLinecap="round"
          />
        ))}
        {/* Minute hand — 12 o'clock */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - 78} stroke="#EAEAEA" strokeWidth="2" strokeLinecap="round" />
        {/* Hour hand — 3 o'clock */}
        <line x1={cx} y1={cy} x2={cx + 58} y2={cy} stroke="#EAEAEA" strokeWidth="3" strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="7" fill="#FF6A2A" />
        <circle cx={cx} cy={cy} r="3.5" fill="#050505" />
      </svg>
    </div>
  )
}

function SandboxVisual() {
  // Isometric box — 30° projection, W=D=120, H=95
  // i_vec=(-104,60) j_vec=(104,60) h_vec=(0,-95)
  const A = { x: 220, y: 165 } // front-bottom
  const B = { x: 324, y: 225 } // right-bottom
  const C = { x: 220, y: 285 } // back-bottom
  const D = { x: 116, y: 225 } // left-bottom
  const E = { x: 220, y: 70  } // front-top
  const F = { x: 324, y: 130 } // right-top
  const G = { x: 220, y: 190 } // back-top
  const H = { x: 116, y: 130 } // left-top

  const pts = (...vs: { x: number; y: number }[]) =>
    vs.map(v => `${v.x},${v.y}`).join(' ')

  return (
    <div className="flex flex-1 items-center justify-center py-4" aria-hidden="true">
      <svg viewBox="0 0 440 320" className="w-full max-w-[360px]" fill="none">
        <defs>
          <filter id="iso-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Isometric floor grid ── */}
        <polygon points="220,45 324,105 220,165 116,105"  fill="#0C0C0C" stroke="#1B1B1B" strokeWidth="0.75" />
        <polygon points="324,105 428,165 324,225 220,165" fill="#0A0A0A" stroke="#191919" strokeWidth="0.75" />
        <polygon points="116,105 220,165 116,225 12,165"  fill="#0A0A0A" stroke="#191919" strokeWidth="0.75" />
        <polygon points={pts(A, B, C, D)}                 fill="#090909" stroke="#181818" strokeWidth="0.75" />
        <polygon points="324,225 428,285 324,345 220,285" fill="#080808" stroke="#161616" strokeWidth="0.75" />
        <polygon points="116,225 220,285 116,345 12,285"  fill="#080808" stroke="#161616" strokeWidth="0.75" />

        {/* ── Very subtle face tints for depth ── */}
        <polygon points={pts(E, F, G, H)} fill="#FF6A2A" fillOpacity="0.055" />
        <polygon points={pts(A, B, F, E)} fill="#FF6A2A" fillOpacity="0.028" />
        <polygon points={pts(A, D, H, E)} fill="#FF6A2A" fillOpacity="0.028" />

        {/* ── Glow bloom layer ── */}
        <g filter="url(#iso-glow)" stroke="#FF6A2A" strokeLinecap="round">
          {/* Top edges */}
          <line x1={E.x} y1={E.y} x2={F.x} y2={F.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={F.x} y1={F.y} x2={G.x} y2={G.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={G.x} y1={G.y} x2={H.x} y2={H.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={H.x} y1={H.y} x2={E.x} y2={E.y} strokeWidth="4" strokeOpacity="0.65" />
          {/* Front visible edges */}
          <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={A.x} y1={A.y} x2={E.x} y2={E.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={B.x} y1={B.y} x2={F.x} y2={F.y} strokeWidth="4" strokeOpacity="0.65" />
          <line x1={D.x} y1={D.y} x2={H.x} y2={H.y} strokeWidth="4" strokeOpacity="0.65" />
          {/* Hidden back edges — dim */}
          <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} strokeWidth="2.5" strokeOpacity="0.18" />
          <line x1={D.x} y1={D.y} x2={C.x} y2={C.y} strokeWidth="2.5" strokeOpacity="0.18" />
          <line x1={C.x} y1={C.y} x2={G.x} y2={G.y} strokeWidth="2.5" strokeOpacity="0.18" />
        </g>

        {/* ── Crisp edge lines on top ── */}
        <g stroke="#FF6A2A" strokeLinecap="round">
          <line x1={E.x} y1={E.y} x2={F.x} y2={F.y} strokeWidth="1.5" />
          <line x1={F.x} y1={F.y} x2={G.x} y2={G.y} strokeWidth="1.5" />
          <line x1={G.x} y1={G.y} x2={H.x} y2={H.y} strokeWidth="1.5" />
          <line x1={H.x} y1={H.y} x2={E.x} y2={E.y} strokeWidth="1.5" />
          <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} strokeWidth="1.5" />
          <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} strokeWidth="1.5" />
          <line x1={A.x} y1={A.y} x2={E.x} y2={E.y} strokeWidth="1.5" />
          <line x1={B.x} y1={B.y} x2={F.x} y2={F.y} strokeWidth="1.5" />
          <line x1={D.x} y1={D.y} x2={H.x} y2={H.y} strokeWidth="1.5" />
          <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} strokeWidth="0.75" strokeOpacity="0.2" />
          <line x1={D.x} y1={D.y} x2={C.x} y2={C.y} strokeWidth="0.75" strokeOpacity="0.2" />
          <line x1={C.x} y1={C.y} x2={G.x} y2={G.y} strokeWidth="0.75" strokeOpacity="0.2" />
        </g>

        {/* ── Corner vertex glow dots ── */}
        <g fill="#FF6A2A" filter="url(#iso-glow)">
          <circle cx={E.x} cy={E.y} r="3"   opacity="0.9" />
          <circle cx={F.x} cy={F.y} r="3"   opacity="0.9" />
          <circle cx={H.x} cy={H.y} r="3"   opacity="0.9" />
          <circle cx={G.x} cy={G.y} r="2.5" opacity="0.5" />
          <circle cx={A.x} cy={A.y} r="2.5" opacity="0.85" />
          <circle cx={B.x} cy={B.y} r="2.5" opacity="0.8" />
          <circle cx={D.x} cy={D.y} r="2.5" opacity="0.8" />
        </g>
      </svg>
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
    Visual: GlobeVisual,
  },
  {
    heading: 'One file. One endpoint.',
    description:
      'Drop in a function file. Mercio wraps it in an isolated runtime and hands you an always-on serverless endpoint.',
    Visual: FunctionVisual,
  },
  {
    heading: 'Push code. Run CI.',
    description:
      'Your existing GitHub workflows run in clean, isolated environments with live build logs on every push.',
    Visual: PipelineVisual,
  },
  {
    heading: 'Set a schedule. Forget the rest.',
    description:
      'Define a cron expression. Mercob fires your function on time, retries on failure, and keeps a full run history.',
    Visual: ClockVisual,
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
