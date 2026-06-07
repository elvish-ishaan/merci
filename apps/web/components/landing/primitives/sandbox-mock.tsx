export function SandboxMock() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-brand-border bg-brand-surface font-mono-brand text-sm"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-highlight" />
        <span className="ml-2 text-xs text-brand-fg-muted">merci-sandbox — execute</span>
      </div>
      <div className="p-5 text-xs leading-relaxed space-y-4">
        <div className="space-y-1">
          <p className="text-brand-fg-muted">POST /mcp · tool: execute_code</p>
          <div className="flex gap-3 text-brand-fg-subtle">
            <span>language: <span className="text-brand-accent">typescript</span></span>
            <span>timeout: <span className="text-brand-accent">30s</span></span>
          </div>
        </div>
        <div className="rounded border border-brand-border bg-brand-bg p-3 space-y-0.5">
          <p>
            <span className="text-brand-fg-muted">{'  '}</span>
            <span className="text-purple-400">const</span>
            <span className="text-brand-fg"> nums </span>
            <span className="text-brand-fg-muted">= [</span>
            <span className="text-yellow-300">1, 2, 3, 4, 5</span>
            <span className="text-brand-fg-muted">]</span>
          </p>
          <p>
            <span className="text-purple-400">const</span>
            <span className="text-brand-fg"> total </span>
            <span className="text-brand-fg-muted">= nums.</span>
            <span className="text-brand-accent">reduce</span>
            <span className="text-brand-fg-muted">((s, n) </span>
            <span className="text-purple-400">=&gt;</span>
            <span className="text-brand-fg"> s + n</span>
            <span className="text-brand-fg-muted">, 0)</span>
          </p>
          <p>
            <span className="text-brand-fg-muted">console.</span>
            <span className="text-brand-accent">log</span>
            <span className="text-brand-fg-muted">(</span>
            <span className="text-green-400">{"`sum: ${total}`"}</span>
            <span className="text-brand-fg-muted">)</span>
          </p>
        </div>
        <div className="border-t border-brand-border pt-3 space-y-1.5">
          <div className="flex items-start gap-3">
            <span className="text-brand-accent w-10 shrink-0">stdout</span>
            <span className="text-brand-fg-subtle">sum: 15</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-brand-fg-muted w-10 shrink-0">stderr</span>
            <span className="text-brand-fg-muted">(none)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-brand-fg-muted w-10 shrink-0">exit</span>
            <span>
              <span className="text-brand-accent">0</span>
              <span className="text-brand-fg-muted"> · 182ms · --network none</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
