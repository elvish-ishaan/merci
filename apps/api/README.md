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
| `/internal` | Worker-only endpoints (build logs, status, job-run updates) |
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
| `WORKER_SECRET` | yes | Shared secret for `/internal` routes |
| `REDIS_HOST` | yes | Redis host |
| `REDIS_PORT` | no | Redis port (default 6379) |
| `R2_ENDPOINT` | yes | Cloudflare R2 S3 endpoint |
| `R2_ACCESS_KEY_ID` | yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | yes | R2 secret key |
| `R2_BUCKET_NAME` | yes | R2 bucket |
| `ENV_ENCRYPTION_KEY` | yes | 64-char hex key for env var encryption |
| `GITHUB_CLIENT_ID` | no | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | no | GitHub OAuth app secret |
| `GITHUB_REDIRECT_URI` | no | OAuth callback URL |
| `BASE_DOMAIN` | no | Apex domain for subdomain routing + Caddy TLS check |
| `PORT` | no | HTTP listen port (default 3001) |
