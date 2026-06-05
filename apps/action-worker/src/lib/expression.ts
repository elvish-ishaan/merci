export interface ExprContext {
  github: Record<string, string>
  secrets: Record<string, string>
  env: Record<string, string>
  inputs: Record<string, string>
}

// Interpolate ${{ expr }} placeholders in a string
export function interpolate(template: string | undefined, ctx: ExprContext): string {
  if (!template) return ''
  return template.replace(/\$\{\{\s*(.+?)\s*\}\}/g, (_match, expr) => {
    return evalExpr(expr.trim(), ctx)
  })
}

// Evaluate a simple context access expression like "github.sha" or "secrets.TOKEN"
function evalExpr(expr: string, ctx: ExprContext): string {
  const dot = expr.indexOf('.')
  if (dot === -1) return ''
  const ns = expr.slice(0, dot).toLowerCase()
  const key = expr.slice(dot + 1)

  switch (ns) {
    case 'github':  return ctx.github[key] ?? ctx.github[key.toLowerCase()] ?? ''
    case 'secrets': return ctx.secrets[key] ?? ctx.secrets[key.toUpperCase()] ?? ''
    case 'env':     return ctx.env[key] ?? ''
    case 'inputs':  return ctx.inputs[key] ?? ''
    default:        return ''
  }
}

// Evaluate a step `if:` condition string
// Supports: success(), failure(), always(), cancelled(), true, false, basic == comparisons
export function evalCondition(condition: string | undefined, stepFailed: boolean): boolean {
  if (!condition) return true
  const c = condition.trim().toLowerCase()
  if (c === 'true' || c === 'always()' || c === '!cancelled()') return true
  if (c === 'false') return false
  if (c === 'success()') return !stepFailed
  if (c === 'failure()') return stepFailed
  // fallback: treat unknown conditions as true so we don't silently skip steps
  return true
}
