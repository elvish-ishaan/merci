'use client'

import { useEffect, useRef, useId } from 'react'

interface MermaidDiagramProps {
  chart: string
  caption?: string
}

export function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')

  useEffect(() => {
    let cancelled = false

    async function render() {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          background: '#0d0d0d',
          primaryColor: '#1a1a2e',
          primaryTextColor: '#e2e8f0',
          primaryBorderColor: '#2d2d3d',
          lineColor: '#6366f1',
          secondaryColor: '#1e1e2e',
          tertiaryColor: '#16213e',
          fontSize: '14px',
        },
      })

      if (cancelled || !ref.current) return
      const { svg } = await mermaid.render(`mermaid-${id}`, chart.trim())
      if (cancelled || !ref.current) return
      ref.current.innerHTML = svg
    }

    render().catch(() => {
      if (ref.current) {
        ref.current.innerHTML = `<pre class="text-xs text-brand-fg-muted p-4">${chart}</pre>`
      }
    })

    return () => {
      cancelled = true
    }
  }, [chart, id])

  return (
    <figure className="my-8 rounded-lg border border-brand-border bg-brand-surface overflow-hidden">
      <div
        ref={ref}
        className="p-6 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        aria-label={caption ?? 'Architecture diagram'}
        role="img"
      />
      {caption && (
        <figcaption className="border-t border-brand-border px-6 py-3 text-xs text-brand-fg-muted font-mono-brand">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
