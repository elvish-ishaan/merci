# api

The REST API service for Mercy. Built with Express.js running on Bun (port 3001).

## Routes

| Prefix | Description |
|--------|-------------|
| `/auth` | Register, login, GitHub OAuth |
| `/deploy` | Static deployment CRUD, env vars |
| `/deploy/:projectId/domains` | Custom domain management |
| `/api/mercio` | Serverless function upload / management |
| `/mercio/:id` | Serverless function invocation proxy |
| `/api/mercob/jobs` | Scheduled job CRUD + manual trigger |
| `/api/mercob/runs` | Job run history and logs |
| `/webhook` | GitHub webhook receiver — validates HMAC, triggers CI runs |
| `/api/repos` | CI repo registration, webhook sync, secret management |
| `/api/runs` | CI run list, run detail, job detail, step logs, re-run |
| `/api/sandbox/keys` | Sandbox API key CRUD (list, create, revoke) — JWT auth |
| `/api/sandbox/execute` | Execute JS/TS code via REST (SDK-facing) — JWT auth |
| `/mcp` | Remote MCP server (`POST`/`GET`/`DELETE`) — Sandbox API key Bearer auth |
| `/internal` | Worker-only endpoints (build logs, action logs, status patches for steps/jobs/runs) |
| `/` | GitHub OAuth callback + repo listing |

Subdomain routing (`<subdomain>.BASE_DOMAIN`) is handled transparently by `subdomainMiddleware` before any route — matching requests are served directly by `appRouter` from Cloudflare R2.

## Development

```bash
bun run dev   # watch mode
bun test      # run tests (bun:test + supertest, ~155 tests across 12 files)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | JWT signing key (32+ chars) |
| `WORKER_SECRET` | yes | Shared secret for `/internal` routes — **must match `action-worker`** |
| `REDIS_HOST` | yes | Redis host |
| `REDIS_PORT` | no | Redis port (default 6379) |
| `R2_ENDPOINT` | yes | Cloudflare R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | yes | R2 secret key |
| `R2_BUCKET_NAME` | yes | R2 bucket |
| `ENV_ENCRYPTION_KEY` | yes | 64-char hex key for env var encryption — **must match `action-worker`** |
| `GITHUB_CLIENT_ID` | no | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | no | GitHub OAuth app secret |
| `GITHUB_REDIRECT_URI` | no | OAuth callback URL |
| `WEBHOOK_SECRET` | yes | GitHub webhook HMAC secret |
| `BASE_DOMAIN` | no | Apex domain for subdomain routing + Caddy TLS check |
| `PORT` | no | HTTP listen port (default 3001) |
| `SANDBOX_ENGINE_URL` | yes | Base URL of `merci-sandbox-engine` (e.g. `http://localhost:3003`) |
| `SANDBOX_ENGINE_SECRET` | yes | Shared secret for engine auth — **must match `SANDBOX_ENGINE_SECRET` in merci-sandbox-engine** |

## Internal API — CI callbacks

The `/internal` prefix is protected by `WORKER_SECRET` (Bearer token). The `action-worker` uses these endpoints to report progress:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/action-logs` | Persist a log line for a step; publishes to Redis `action:run:<runId>` |
| `PATCH` | `/internal/action-steps/:stepId` | Update step status/timestamps; publishes `step-status` event |
| `PATCH` | `/internal/action-jobs/:jobId` | Update job status/timestamps; publishes `job-status` event |
| `PATCH` | `/internal/action-runs/:runId` | Update run status/timestamps; publishes `run-status` event |

All CI events are published on a single Redis channel per run (`action:run:<runId>`), which the `ws` service fans out to connected browser clients.
