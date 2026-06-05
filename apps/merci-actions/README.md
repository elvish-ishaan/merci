# merci-actions

The CI orchestration service for mercy. Receives GitHub webhook payloads, parses workflow YAML files, creates run/job/step records in the database, and enqueues jobs for `action-worker` to execute. Also exposes the REST API that the web dashboard polls for run status and logs.

Runs on port **3003**.

---

## How it fits in the system

```
GitHub ──► POST /webhook/:repoId ──► merci-actions
                                          │
                                    verify HMAC signature
                                    fetch .github/workflows/*.yml from GitHub API
                                    parse workflow YAML
                                    match push/PR event against triggers
                                          │
                                    ActionRun  ─┐
                                    ActionJob   ├─ created in Postgres
                                    ActionStep ─┘
                                          │
                                    BullMQ queue "merci-actions"
                                          │
                                    action-worker picks up job
                                          │
                               worker calls back via internal API:
                               PATCH /internal/action-steps/:id   (status updates)
                               POST  /internal/action-logs         (log lines)
                               PATCH /internal/action-jobs/:id
                               PATCH /internal/action-runs/:id
                                          │
                               Redis pub/sub notifies connected clients

Web dashboard ──► GET /api/runs/:runId ──► merci-actions ──► Postgres
```

---

## Routes

### Public API (`/api/*`) — requires JWT auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/repos` | List repos connected to CI |
| `POST` | `/api/repos` | Connect a new repo (registers GitHub webhook) |
| `GET` | `/api/repos/:id` | Repo detail |
| `DELETE` | `/api/repos/:id` | Disconnect repo (removes webhook) |
| `POST` | `/api/repos/:id/webhook/sync` | Update webhook URL (after domain change) |
| `GET` | `/api/repos/:id/secrets` | List secret names |
| `PUT` | `/api/repos/:id/secrets/:name` | Create or update a secret |
| `DELETE` | `/api/repos/:id/secrets/:name` | Delete a secret |
| `GET` | `/api/runs` | List runs (optionally filtered by `?repoId=`) |
| `GET` | `/api/runs/:runId` | Run detail with jobs |
| `POST` | `/api/runs/:runId/rerun` | Re-run a workflow at the same SHA |
| `GET` | `/api/runs/:runId/jobs/:jobId` | Job detail with steps |
| `GET` | `/api/runs/:runId/jobs/:jobId/steps/:stepId/logs` | Step log lines |

### Webhook (`/webhook/:repoId`) — HMAC authenticated

Receives `push` and `pull_request` events from GitHub. Verifies the `X-Hub-Signature-256` header against the repo's stored webhook secret.

### Internal (`/internal/*`) — `WORKER_SECRET` authenticated

Called by `action-worker` only. Not exposed to the internet.

| Method | Path | Description |
|---|---|---|
| `POST` | `/internal/action-logs` | Save a log line for a step + publish to Redis |
| `PATCH` | `/internal/action-steps/:stepId` | Update step status/conclusion + publish to Redis |
| `PATCH` | `/internal/action-jobs/:jobId` | Update job status/conclusion + publish to Redis |
| `PATCH` | `/internal/action-runs/:runId` | Update run status/conclusion + publish to Redis |

---

## Re-run

`POST /api/runs/:runId/rerun` re-fetches the original workflow YAML from GitHub at the exact same SHA, parses it, creates fresh DB records, and enqueues new BullMQ jobs. The response contains the new `ActionRun` ID so the UI can navigate directly to the new run page.

---

## Data model

```
ActionRepo         one repo → many runs, many secrets
ActionRun          one workflow trigger → many jobs
  workflowFile     e.g. "ci.yml"
  event            "push" | "pull_request"
  ref / sha
  status           QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED

ActionJob          one job block in the YAML → many steps
  jobKey           key from jobs: map
  name             display name

ActionStep         one entry in steps: list + implicit "Set up job" (number: -1)
  number           -1 = setup, 0..N = user steps
  status           QUEUED | RUNNING | SUCCEEDED | FAILED | SKIPPED

ActionLog          one line of stdout/stderr output for a step
ActionSecret       encrypted value stored per repo
```

---

## Workflow support

Supported YAML syntax:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_ENV: production

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
        env:
          API_KEY: ${{ secrets.API_KEY }}
        if: ${{ github.ref == 'refs/heads/main' }}
        continue-on-error: false
```

Supported features:
- `push` and `pull_request` triggers with `branches`, `tags`, `branches-ignore`, `tags-ignore`, `types` filters
- `uses:` steps — Node.js (`node20`/`node16`) actions downloaded from GitHub and executed in the container
- `run:` steps — shell commands executed with `bash -e -c`
- `env:` at workflow, job, and step level
- `secrets.*` interpolation
- `if:` conditions with `github.*` context
- `continue-on-error:`
- `with:` inputs for actions (defaults from `action.yml` are applied, `${{ github.* }}` resolved)
- `GITHUB_ENV` file for exporting env vars between steps

---

## Development

```bash
bun run dev    # watch mode on :3003
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | JWT signing key (same as `apps/api`) |
| `WORKER_SECRET` | yes | Shared secret for `/internal` routes |
| `REDIS_HOST` | yes | Redis host |
| `REDIS_PORT` | no | Redis port (default 6379) |
| `ENV_ENCRYPTION_KEY` | yes | 64-char hex key for token/secret encryption |
| `MERCI_ACTIONS_URL` | yes | Public URL for GitHub webhook delivery |
| `PORT` | no | Listen port (default 3003) |

---

## Source layout

```
apps/merci-actions/
  index.ts                entry point — Express app + route mounting
  src/
    middleware/
      auth.ts             JWT auth middleware
    routes/
      webhook.ts          GitHub webhook receiver
      repos.ts            Repo + secret CRUD
      runs.ts             Run/job/step/log read API + rerun
      internal.ts         Worker callback endpoints (logs, status patches)
    lib/
      prisma.ts           Prisma client singleton
      redis.ts            ioredis pub + connection config
      queue.ts            BullMQ Queue for "merci-actions"
      github.ts           GitHub API helpers (fetch workflow files, manage webhooks)
      yaml-parser.ts      Workflow YAML parser
      trigger.ts          Trigger matching (push/PR branch/tag filters)
      jwt.ts              JWT sign/verify
      hmac.ts             Webhook HMAC verification
      logger.ts           Pino logger instance
```
