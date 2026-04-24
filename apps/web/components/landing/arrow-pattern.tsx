const ROWS = 14
const COLS = 32

function PatternRow() {
  return (
    <div className="flex shrink-0 flex-col gap-6 px-8 py-10 font-mono-brand text-2xl leading-none text-brand-accent/10 select-none">
      {Array.from({ length: ROWS }).map((_, i) => (
        <div
          key={i}
          className="flex gap-8 whitespace-nowrap"
          style={{ opacity: 0.45 + (i % 3) * 0.2 }}
        >
          {Array.from({ length: COLS }).map((_, j) => (
            <span key={j}>&gt;&gt;&gt;</span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function ArrowPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      <div
        className="landing-drift flex will-change-transform"
        style={{ animation: 'landing-drift 40s linear infinite' }}
      >
        <PatternRow />
        <PatternRow />
      </div>
    </div>
  )
}
