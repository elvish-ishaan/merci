# mercy

A self-hosted cloud platform. Deploy static sites, run serverless functions, schedule jobs, and execute GitHub Actions-compatible CI workflows — all from one dashboard.

---

## What's inside

| App / Package | Description |
|---|---|
| `apps/web` | Next.js dashboard (React 19, Tailwind v4, shadcn/ui) |
| `apps/api` | REST API — auth, deployments, Mercio, Mercob, CI webhooks + orchestration (Express + Bun, port 3001) |
| `apps/ws` | WebSocket service — real-time log streaming for builds and CI runs (port 3002) |
| `apps/worker` | Build worker — clones repos, runs esbuild, uploads to R2 |
| `apps/mercio-runtime` | Serverless function runtime — executes user code in workerd V8 isolates |
| `apps/mercob` | Scheduled job engine — polls DB, dispatches to BullMQ |
| `apps/action-worker` | CI execution worker — clones repos, manages Docker containers, runs workflow steps |
| `packages/db` | Prisma schema + generated client (shared across all services) |
| `packages/logger` | Shared pino logger factory |
| `packages/crypto` | AES-256-GCM encrypt/decrypt for secrets and tokens |

---

## Features

### Static Deployments
Push a repo URL, mercy clones it, builds it, and serves it from Cloudflare R2 under a `<subdomain>.app.<domain>` URL. Custom domains with automatic Let's Encrypt TLS via Caddy.

### Mercio — Serverless Functions
Upload a zip of Node.js code and get a public URL. Each request is executed in an isolated [workerd](https://github.com/cloudflare/workerd) V8 process. Cold starts are ~100–200 ms; warm requests are single-digit ms.

### Mercob — Scheduled Jobs
Cron, interval, daily, weekly, or one-shot schedules that call any Mercio function. Full run history with logs.

### Merci Actions — CI Runner
GitHub Actions-compatible CI engine built into `apps/api`. Connect a repo, push code, and your `.github/workflows/*.yml` files run automatically in Docker containers. Includes:
- Real-time log and status streaming via WebSocket — no polling, sub-second updates
- `actions/checkout@v4` and other Node.js actions fully supported
- Re-run any workflow run from the UI without pushing again
- Per-repo encrypted secrets

---

## Architecture

```
Browser
  │
  ├── HTTPS ──► Caddy (reverse proxy + TLS)
  │                │
  │      ┌─────────┴──────────────────────────────────┐
  │      │                                            │
  │   apps/web (Next.js :3000)             apps/api (:3001)
  │                                         │   GitHub webhooks
  │              ┌──────────────────────────┤   CI orchestration
  │              │                          │   REST API
  │         apps/ws (:3002)             BullMQ (Redis)
  │         (WebSocket)                     │
  │    ┌─── real-time logs          ┌───────┴──────────┐
  │    │    & CI status ────────────┤                  │
  │    └───────────────────────     apps/worker    apps/action-worker
  │                                 (build jobs)   (CI jobs — Docker)
  └── GitHub Webhooks ──► apps/api
                                apps/mercio-runtime
                                (function invocations — workerd)
                                apps/mercob
                                (scheduled job poller)

Shared: PostgreSQL · Redis · Cloudflare R2
```

---

## Local development

### Prerequisites

- [Bun](https://bun.sh) 1.x
- Docker (required for `action-worker` container execution)
- PostgreSQL
- Redis

### 1. Install dependencies

```bash
bun install
```

### 2. Start infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
# starts postgres:5432 and redis:6379
```

### 3. Configure environment

Each app reads a `.env` file in its own directory. The minimal set for local dev:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mercy
JWT_SECRET=<32+ random chars>
WORKER_SECRET=<32+ random chars>
ENV_ENCRYPTION_KEY=<64 hex chars>
REDIS_HOST=localhost
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See `docker/.env.compose.example` for the full variable reference.

### 4. Run database migrations

```bash
cd packages/db && bunx prisma migrate dev
```

### 5. Start services

```bash
# In separate terminals:
bun run --filter apps/api dev            # :3001  (REST API + CI webhook receiver)
bun run --filter apps/ws dev             # :3002  (WebSocket — build logs + CI run events)
bun run --filter apps/web dev            # :3000  (Next.js dashboard)
bun run --filter apps/action-worker dev  # CI execution worker (needs Docker)
bun run --filter apps/worker dev         # static site build worker
```

---

## Production deployment

A Docker Compose stack with Caddy for automatic TLS is provided under `docker/`.

```bash
cp docker/.env.compose.example docker/.env
# Fill in your domain, secrets, R2 credentials, and GitHub OAuth app details

docker compose -f docker/docker-compose-prod.yml up -d
```

See `docker/.env.compose.example` for all required variables and inline documentation.

---

## Shared packages

### `@repo/db`
Prisma client shared by all services. Run migrations from `packages/db/`:
```bash
bunx prisma migrate dev    # dev
bunx prisma migrate deploy # production
```

### `@repo/logger`
```ts
import { createLogger } from '@repo/logger'
const logger = createLogger('my-service')
logger.info({ userId }, 'user logged in')
```
Pretty-prints in development (`NODE_ENV !== 'production'`), structured JSON in production.

### `@repo/crypto`
```ts
import { encryptValue, decryptValue } from '@repo/crypto'
const enc = encryptValue('my-secret')  // AES-256-GCM, base64 ciphertext
const plain = decryptValue(enc)
```
Requires `ENV_ENCRYPTION_KEY` (64-char hex). Used for storing GitHub tokens and repo secrets at rest.

---

## Repository layout

```
mercy/
  apps/
    api/                REST API + CI webhook receiver + orchestration (Express + Bun, :3001)
    ws/                 WebSocket streaming — build logs + CI run events (:3002)
    web/                Next.js frontend (:3000)
    worker/             Static site build worker (BullMQ)
    mercio-runtime/     Serverless function runtime (workerd)
    mercob/             Scheduled job engine
    action-worker/      CI Docker execution worker
  packages/
    db/                 Prisma schema + generated client
    logger/             Shared pino logger
    crypto/             AES-256-GCM utilities
  docker/
    docker-compose.yml            Local dev infra (postgres + redis)
    docker-compose-prod.yml       Full production stack
    .env.compose.example          All environment variables documented
```
