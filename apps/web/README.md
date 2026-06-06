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
```

## Real-time updates

### Static deployment logs
`/dashboard/projects/[id]/logs` connects to the `ws` service at `NEXT_PUBLIC_WS_URL/<projectId>?token=…`. Historical logs are replayed on connect; new lines stream live until the build completes.

### CI run detail (`/dashboard/actions/[repoId]/runs/[runId]`)
Opens a single WebSocket to `NEXT_PUBLIC_WS_URL/actions/<runId>?token=…`. The `ws` service verifies ownership, replays current run/job/step status from the database, then forwards live events from Redis as the worker progresses:

| Event type | What updates |
|---|---|
| `run-status` | Top-level status badge + duration |
| `job-status` | Per-job status badge + duration |
| `step-status` | Per-step status badge + timestamps inside an expanded job |
| `log` | New log line appended to an expanded step's log panel |

The WebSocket connection is opened once per page visit and stays open until the page unmounts. A "Live" indicator (pulsing green dot) is shown while the run is active and the socket is connected. Step logs are initially loaded over HTTP when a step row is expanded; subsequent lines arrive over the same run socket without polling.
