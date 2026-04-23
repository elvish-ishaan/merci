# mercob

mercob is the scheduled-job engine for the mercy platform. It polls the database for due jobs, dispatches them onto a BullMQ queue, and tracks every execution attempt to completion.

---

## How it fits in the system

```
User (API) ──POST /mercob──► ScheduledJob (Postgres)
                                      │
                              mercob poller (60 s tick)
                                      │
                              dispatch() per job
                                      │
                         JobRun row created (status=QUEUED)
                                      │
                    BullMQ queue  "mercio-invocations"  (Redis)
                                      │
                         mercio-runtime Worker picks up job
                                      │
                         ensure(functionId) ──► workerd pool
                                      │
                         HTTP request to workerd process
                                      │
                    ┌─────────────────┴──────────────────┐
                    │                                    │
               succeeded                            failed / timeout
                    │                                    │
          JobRun status=SUCCEEDED              JobRun status=FAILED|TIMEOUT
                    │                                    │
              (retry loop if maxRetries > 0)             │
                    └──────────── advance nextRunAt ──────┘
```

---

## Components

### `index.ts` — entry point

Validates required environment variables, starts the poller, and handles `SIGINT` for clean shutdown.

### `src/poller.ts` — tick loop

Runs immediately on startup and then every **60 seconds**. Each tick:

1. Queries `ScheduledJob` rows where `active = true` and `nextRunAt ≤ now + 60 s` (look-ahead window avoids clock skew).
2. Dispatches all due jobs in parallel with a concurrency cap of **10** (jobs are processed in chunks).

### `src/dispatch.ts` — per-job orchestration

Handles one `ScheduledJob` end-to-end:

1. Creates a `JobRun` row (`status=QUEUED`).
2. Loops up to `maxRetries + 1` times:
   - Patches the run to `RUNNING` via the internal API.
   - Adds a BullMQ job to the `mercio-invocations` queue with the HTTP request parameters and `timeoutMs`.
   - Calls `waitUntilFinished(queueEvents, timeoutMs + 30_000)` — the extra 30 s buffer lets the runtime worker fail the job cleanly before the dispatcher gives up.
   - On success: patches the run to `SUCCEEDED` with HTTP status, response body, and duration.
   - On failure: retries or marks `FAILED` / `TIMEOUT` depending on the error type.
3. Advances `nextRunAt` (recurring jobs) or deactivates the job (one-shot jobs).

The `+30_000 ms` buffer on `waitUntilFinished` is intentional: the runtime enforces the hard deadline internally via `AbortController`, so the BullMQ "failed" event always arrives before the dispatcher's wait expires.

### `src/schedule.ts` — next-run computation

Computes `nextRunAt` given a job's schedule configuration. Supports all five schedule kinds:

| `scheduleKind` | Config fields used |
|---|---|
| `INTERVAL` | `intervalSec` |
| `DAILY` | `timeOfDay` (HH:MM UTC) |
| `WEEKLY` | `timeOfDay`, `daysOfWeek` (0 = Sunday) |
| `CRON` | `cronExpr` (standard 5-field cron, parsed with `cron-parser`) |
| `ONCE` | `runAt` (one-shot, job deactivated after firing) |

---

## Runtime integration (`mercio-runtime`)

mercob only queues jobs — it does not execute function code. Execution is handled by `mercio-runtime`:

- Listens on the BullMQ `mercio-invocations` queue (`concurrency: 8`, `lockDuration: 5 min`).
- Calls `ensure(functionId)` to get a warm workerd process from the pool (cold-starting from R2 if needed).
- Makes the HTTP request to the workerd process with the job's method, path, query, headers, and body.
- Enforces `timeoutMs` via `AbortController` — the fetch is aborted and the BullMQ job fails cleanly if the deadline is exceeded.
- Posts a log line to the internal API (`POST /internal/job-logs`) after each response.

---

## API integration

The REST API (`apps/api`) exposes:

| Method | Path | Description |
|---|---|---|
| `POST` | `/mercob` | Create a scheduled job |
| `GET` | `/mercob` | List all jobs for the authenticated user |
| `GET` | `/mercob/:id` | Get a single job |
| `PATCH` | `/mercob/:id` | Update schedule, config, or active flag |
| `DELETE` | `/mercob/:id` | Delete a job |
| `POST` | `/mercob/:id/trigger` | Manually fire the job immediately |
| `GET` | `/mercob/:id/runs` | Paginated run history |
| `GET` | `/mercob-runs/:runId` | Single run with full log stream |

The internal API (`/internal/*`) is called by mercob and mercio-runtime using `WORKER_SECRET`:

- `POST /internal/job-logs` — append a log line to a `JobRunLog`
- `PATCH /internal/job-runs/:runId` — update run status, HTTP status, duration, error message

---

## Data model

```
ScheduledJob
  id, userId, functionId, name
  active, recurring
  scheduleKind, timeOfDay, daysOfWeek, intervalSec, cronExpr, runAt
  method, path, query, headers, body
  maxRetries, timeoutMs          -- defaults: 0 retries, 30 000 ms
  nextRunAt, lastRunAt

JobRun
  id, jobId, attempt, status
  scheduledFor, startedAt, finishedAt, durationMs
  httpStatus, responseBody, errorMessage
  logs  →  JobRunLog[]

JobRunStatus: QUEUED | RUNNING | SUCCEEDED | FAILED | TIMEOUT
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `REDIS_HOST` | yes | — | Redis host |
| `REDIS_PORT` | no | `6379` | Redis port |
| `WORKER_SECRET` | yes | — | Shared secret for internal API calls |
| `API_BASE_URL` | no | `http://localhost:3001` | Base URL of the API service |

---

## Running locally

```bash
# from the repo root
bun run --filter @repo/mercob dev
```

Requires Postgres and Redis to be running and `DATABASE_URL` / `REDIS_HOST` / `WORKER_SECRET` set (see `.env.example`).
