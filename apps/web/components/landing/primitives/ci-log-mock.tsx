export function CiLogMock() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-brand-border bg-brand-surface font-mono-brand text-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="ml-2 text-xs text-brand-fg-muted">merci-actions — ci.yml · a3f2d1c</span>
      </div>
      <div className="p-5 text-xs leading-relaxed space-y-3">
        <div className="space-y-1.5">
          {[
            { label: 'Set up job', time: '2.1s', done: true },
            { label: 'actions/checkout@v4', time: '1.3s', done: true },
            { label: 'Install dependencies', time: '12.4s', done: true },
            { label: 'Run tests', time: '8.2s', done: true },
          ].map((step) => (
            <div key={step.label} className="flex items-center justify-between">
              <span>
                <span className="text-brand-accent">✓</span>{' '}
                <span className="text-brand-fg-subtle">{step.label}</span>
              </span>
              <span className="text-brand-fg-muted">{step.time}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 align-middle mr-1.5" />
              <span className="text-brand-fg">Build</span>
            </span>
            <span className="text-brand-fg-muted">running…</span>
          </div>
        </div>
        <div className="border-t border-brand-border pt-3 space-y-1">
          <p className="text-brand-fg-muted">
            <span className="text-brand-fg-subtle">push</span> → main ·{' '}
            <span className="text-brand-fg-subtle">feat: add user auth</span>
          </p>
          <p>
            <span className="text-brand-fg-muted">stream</span>
            <span className="text-brand-fg-muted"> → </span>
            <span className="text-brand-accent">ws://mercy.dev/ws</span>
          </p>
        </div>
      </div>
    </div>
  )
}
