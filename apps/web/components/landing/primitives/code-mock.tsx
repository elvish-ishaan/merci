export function CodeMock() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-brand-border bg-brand-surface font-mono-brand text-xs"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="ml-2 text-xs text-brand-fg-muted">index.js</span>
      </div>
      <div className="p-5 leading-relaxed">
        <p>
          <span className="text-brand-fg-muted">import </span>
          <span className="text-brand-fg">{'{ Hono }'}</span>
          <span className="text-brand-fg-muted"> from </span>
          <span className="text-brand-accent">&apos;hono&apos;</span>
        </p>
        <p className="mt-2">
          <span className="text-brand-fg-muted">const </span>
          <span className="text-brand-fg">app</span>
          <span className="text-brand-fg-muted"> = new </span>
          <span className="text-brand-fg">Hono()</span>
        </p>
        <p className="mt-3">
          <span className="text-brand-fg">app</span>
          <span className="text-brand-fg-muted">.get(</span>
          <span className="text-brand-accent">&apos;/hello&apos;</span>
          <span className="text-brand-fg-muted">, (c) =&gt;</span>
        </p>
        <p className="pl-4">
          <span className="text-brand-fg">c</span>
          <span className="text-brand-fg-muted">.json({'({ ok: true })'})</span>
        </p>
        <p className="text-brand-fg-muted">)</p>
        <p className="mt-3">
          <span className="text-brand-fg-muted">export default </span>
          <span className="text-brand-fg">app</span>
        </p>
        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="text-brand-fg-muted"># invoke</p>
          <p className="mt-1">
            <span className="text-brand-accent">$</span>
            <span className="text-brand-fg"> curl https://api.mercy.dev/mercio/</span>
            <span className="text-brand-fg-muted">{'<id>'}</span>
            <span className="text-brand-fg">/hello</span>
          </p>
          <p className="mt-1 text-brand-fg-muted">
            {'→ { "ok": true }'}
          </p>
        </div>
      </div>
    </div>
  )
}
