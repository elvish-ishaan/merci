# action-worker

The CI execution worker for mercy. Consumes jobs from the `merci-actions` BullMQ queue, clones the repository, pulls a Docker image, creates a container, and runs each workflow step inside it. Streams every log line back to `merci-actions` in real time.

---

## How a job runs

```
BullMQ "merci-actions" queue
          │
          ▼
   processJob(payload)
          │
   ┌──────────────────────────────────────────────────────────┐
   │  Setup phase  (logged to "Set up job" step)              │
   │                                                          │
   │  1. git clone --no-tags <repo> → /tmp/merci-action-<id>/ │
   │  2. git checkout <sha>                                   │
   │  3. docker pull node:20                                  │
   │  4. docker run -d                                        │
   │       -v workspace:/github/workspace                     │
   │       -v githubFiles:/github                             │
   │       -e GITHUB_* ...                                    │
   │       node:20 tail -f /dev/null                          │
   │  5. docker exec git config --global safe.directory "*"   │
   └──────────────────────────────────────────────────────────┘
          │
   ┌──────────────────────────────────────────────────────────┐
   │  Step loop  (one iteration per step in the YAML)         │
   │                                                          │
   │  For run: steps:                                         │
   │    docker exec <container> bash -e -c "<command>"        │
   │                                                          │
   │  For uses: steps (e.g. actions/checkout@v4):             │
   │    1. git clone action repo to host cache                │
   │    2. docker exec mkdir -p /github/actions/<owner>/<repo>│
   │    3. docker cp <cache>/. <container>:/github/actions/…  │
   │    4. docker exec node /github/actions/…/dist/index.js   │
   │                                                          │
   │  All stdout/stderr streamed to merci-actions internal API│
   └──────────────────────────────────────────────────────────┘
          │
   Cleanup: docker rm -f <container>  +  rm -rf /tmp/merci-action-<id>
          │
   PATCH /internal/action-jobs/:id   → SUCCEEDED | FAILED
   PATCH /internal/action-runs/:id   → SUCCEEDED | FAILED
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MERCI_ACTIONS_INTERNAL_URL` | yes | `http://localhost:3003` | Base URL of `merci-actions` for internal callbacks |
| `WORKER_SECRET` | yes | — | Shared secret for internal API authentication |
| `DATABASE_URL` | yes | — | PostgreSQL connection string (reads step IDs) |
| `REDIS_HOST` | yes | — | Redis host |
| `REDIS_PORT` | no | `6379` | Redis port |
| `ENV_ENCRYPTION_KEY` | yes | — | 64-char hex key (decrypts GitHub token + secrets) |
| `WORKER_CONCURRENCY` | no | `2` | Max concurrent Docker containers |

---

## Supported workflow features

### `run:` steps
Shell commands executed inside the container with `bash -e -c`. Supports:
- `env:` overrides at step level
- `working-directory:`
- `shell:` override (e.g. `sh`)
- `continue-on-error:`
- `if:` conditions with `${{ github.* }}`, `${{ secrets.* }}`, `${{ env.* }}`

### `uses:` steps
Node.js actions (`node20` / `node16`) downloaded from GitHub and run with `node`. Supports:
- `with:` inputs mapped to `INPUT_*` env vars
- Defaults from `action.yml` applied automatically (`${{ github.* }}` resolved to actual values)
- Action cache: cloned once to `$RUNNER_TEMP/merci-action-cache/`, reused on subsequent runs
- Cache validation: if the cached dir is missing `action.yml` (partial clone), it is removed and re-cloned

### `actions/checkout@v4`
Fully supported. The workspace is pre-cloned on the host and mounted at `/github/workspace`. Before steps run, `git config --global --add safe.directory "*"` is set inside the container to prevent Git 2.35+ ownership rejections (the workspace is owned by the host user, but the container runs as root).

### Context expressions
`${{ github.sha }}`, `${{ github.ref }}`, `${{ github.repository }}`, `${{ secrets.NAME }}`, `${{ env.NAME }}`, `${{ github.event_name }}` etc. are interpolated in `run:` commands, `if:` conditions, `env:` values, and `with:` inputs.

### `GITHUB_ENV`
Steps can export env vars to subsequent steps by writing `KEY=VALUE` to `$GITHUB_ENV` (mounted at `/github/env`). The worker reads this file after each step and merges new exports into the running env context.

---

## Container environment

Every container gets the following env vars from `buildBaseEnv`:

| Variable | Value |
|---|---|
| `CI` | `true` |
| `GITHUB_ACTIONS` | `true` |
| `GITHUB_WORKSPACE` | `/github/workspace` |
| `GITHUB_ENV` | `/github/env` |
| `GITHUB_OUTPUT` | `/github/output` |
| `GITHUB_STEP_SUMMARY` | `/github/step_summary` |
| `GITHUB_REPOSITORY` | `owner/repo` |
| `GITHUB_SHA` | commit SHA |
| `GITHUB_REF` | full ref (e.g. `refs/heads/main`) |
| `GITHUB_REF_NAME` | branch or tag name |
| `GITHUB_EVENT_NAME` | `push` or `pull_request` |
| `GITHUB_ACTOR` | pusher login |
| `GITHUB_TOKEN` | decrypted GitHub access token |
| `RUNNER_OS` | `Linux` |
| `RUNNER_ARCH` | `X64` |
| `RUNNER_TEMP` | `/github/runner_temp` |

---

## Logging

Every log line produced by a step is sent to `merci-actions` via `POST /internal/action-logs` and stored in `ActionLog`. It is also written to the terminal:

- `stdout` lines → `logger.debug`
- `stderr` lines → `logger.warn` (always visible, useful for catching errors immediately)

The "Set up job" step captures clone/pull/container output the same way, so setup failures are visible both in the terminal and on the run detail page.

---

## Development

```bash
bun run dev    # watch mode
```

Requires Docker to be running. Each job spawns a `node:20` container.

---

## Source layout

```
apps/action-worker/
  index.ts              entry point — creates BullMQ worker, handles SIGINT
  src/
    worker.ts           main job processor (setup + step loop + cleanup)
    lib/
      docker.ts         docker pull / run / exec / cp / rm wrappers
      git.ts            git clone (repo + action) via Bun.spawn
      stream.ts         consumeStream() + LogFn type (shared by docker + git)
      uses.ts           uses: step executor — action download, copy, run
      runner-env.ts     buildBaseEnv() + readExportedEnv()
      expression.ts     ${{ }} interpolation + if: condition evaluation
      api.ts            postLog / patchStep / patchJob / patchRun → merci-actions
      redis.ts           ioredis connection config
      logger.ts         pino logger instance
```
