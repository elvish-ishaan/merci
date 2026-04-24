const runs = [
  { id: '1241', status: 'SUCCEEDED', httpStatus: 200, duration: '142ms' },
  { id: '1240', status: 'FAILED', httpStatus: 500, duration: '31.0s' },
  { id: '1239', status: 'SUCCEEDED', httpStatus: 200, duration: '138ms' },
] as const

const statusStyles: Record<string, string> = {
  SUCCEEDED: 'text-emerald-400 bg-emerald-400/10',
  FAILED: 'text-red-400 bg-red-400/10',
  RUNNING: 'text-brand-accent bg-brand-accent/10',
}

export function RunHistoryMock() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface"
    >
      <div className="border-b border-brand-border px-4 py-3">
        <p className="font-mono-brand text-xs text-brand-fg-muted">Run history — daily-report</p>
      </div>
      <table className="w-full font-mono-brand text-xs">
        <thead>
          <tr className="border-b border-brand-border text-brand-fg-muted">
            <th className="px-4 py-2.5 text-left font-normal">Run</th>
            <th className="px-4 py-2.5 text-left font-normal">Status</th>
            <th className="px-4 py-2.5 text-left font-normal">HTTP</th>
            <th className="px-4 py-2.5 text-left font-normal">Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <tr
              key={run.id}
              className={i < runs.length - 1 ? 'border-b border-brand-border' : ''}
            >
              <td className="px-4 py-3 text-brand-fg-muted">#{run.id}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusStyles[run.status]}`}
                >
                  {run.status}
                </span>
              </td>
              <td className="px-4 py-3 text-brand-fg">{run.httpStatus}</td>
              <td className="px-4 py-3 text-brand-fg-muted">{run.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
