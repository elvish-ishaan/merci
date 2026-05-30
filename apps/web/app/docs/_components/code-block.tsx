interface CodeBlockProps {
  children: string
  filename?: string
  language?: string
}

export function CodeBlock({ children, filename, language }: CodeBlockProps) {
  const label = filename ?? language

  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden my-4">
      {label && (
        <div className="bg-brand-surface-2 border-b border-brand-border px-4 py-2">
          <span className="font-mono-brand text-xs text-brand-fg-muted">{label}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="font-mono-brand text-sm text-brand-fg-subtle whitespace-pre">{children}</code>
      </pre>
    </div>
  )
}
