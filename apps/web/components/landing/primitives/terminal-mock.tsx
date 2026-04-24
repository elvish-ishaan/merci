export function TerminalMock() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-brand-border bg-brand-surface font-mono-brand text-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="ml-2 text-xs text-brand-fg-muted">mercy — terminal</span>
      </div>
      <div className="space-y-2 p-5 text-xs leading-relaxed">
        <p>
          <span className="text-brand-accent">~/my-app</span>
          <span className="text-brand-fg-muted"> $ </span>
          <span className="text-brand-fg">git push origin main</span>
        </p>
        <p className="text-brand-fg-muted">Detected push to main — starting deployment...</p>
        <p>
          <span className="text-brand-fg-muted">  </span>
          <span className="text-brand-accent">✓</span>
          <span className="text-brand-fg-subtle"> Cloning repo</span>
          <span className="text-brand-fg-muted"> (1.2s)</span>
        </p>
        <p>
          <span className="text-brand-fg-muted">  </span>
          <span className="text-brand-accent">✓</span>
          <span className="text-brand-fg-subtle"> Building in Docker</span>
          <span className="text-brand-fg-muted"> (18.4s)</span>
        </p>
        <p>
          <span className="text-brand-fg-muted">  </span>
          <span className="text-brand-accent">✓</span>
          <span className="text-brand-fg-subtle"> Uploading to R2</span>
          <span className="text-brand-fg-muted"> (0.8s)</span>
        </p>
        <p className="pt-1">
          <span className="text-brand-accent">✓ Deployed</span>
          <span className="text-brand-fg-muted"> → </span>
          <span className="text-brand-fg">https://my-app.mercy.dev</span>
        </p>
      </div>
    </div>
  )
}
