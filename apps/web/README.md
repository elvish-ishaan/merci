# web

The Next.js 16 frontend for mercy. Uses React 19, Tailwind CSS v4, and shadcn/ui.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login with email/password or GitHub OAuth |
| `/register` | New account registration |
| `/dashboard` | Static deployment list + real-time build log panel |
| `/dashboard/settings` | Account settings |
| `/dashboard/mercio` | Serverless function list (Mercio) |
| `/dashboard/mercob` | Scheduled job list (Mercob) |
| `/dashboard/mercob/new` | Create a new scheduled job |
| `/dashboard/mercob/[id]` | Scheduled job detail + run history |
| `/dashboard/actions` | CI repos list |
| `/dashboard/actions/new` | Connect a new repo to CI |
| `/dashboard/actions/[repoId]` | Repo run history |
| `/dashboard/actions/[repoId]/runs/[runId]` | Run detail — jobs, steps, live logs, re-run button |
| `/dashboard/actions/[repoId]/secrets` | Manage per-repo encrypted secrets |

## Development

```bash
bun run dev          # start dev server on port 3000
bun run build        # production build
bun run check-types  # TypeScript type check
bun run lint         # ESLint
```

## Environment variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
NEXT_PUBLIC_ACTIONS_URL=http://localhost:3003
```

## Real-time updates

The run detail page polls `merci-actions` while a run is active:
- Run + job statuses refresh every **3 seconds**
- Step statuses refresh every **2 seconds** when the job row is expanded
- Step logs refresh every **2 seconds** when the step row is expanded, with auto-scroll to the latest line
- Polling stops automatically once the run reaches a terminal state (`SUCCEEDED`, `FAILED`, `CANCELLED`)
