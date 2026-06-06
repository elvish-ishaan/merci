# merci-sandbox-engine

Sandbox execution engine for Merci. Receives code execution requests, spins a fresh Docker container per run, captures stdout/stderr/exit code, then returns the result. Called exclusively by `apps/api` — never directly by clients.

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | none | Liveness check |
| `POST` | `/execute` | Bearer `SANDBOX_ENGINE_SECRET` | Execute a code snippet; returns `{ stdout, stderr, exitCode, durationMs }` |

## Request schema (`POST /execute`)

```json
{
  "code": "console.log('hello')",
  "language": "js",
  "timeout": 30
}
```

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| `code` | string | — | required |
| `language` | `"js"` \| `"ts"` | — | required |
| `timeout` | integer | 30 | 1–120 seconds |

## Response

```json
{
  "stdout": "hello\n",
  "stderr": "",
  "exitCode": 0,
  "durationMs": 412
}
```

## Execution model

Each call to `POST /execute`:

1. Generates a UUID run ID
2. Writes `code.js` or `code.ts` into `/tmp/sandbox-<id>/` on the host
3. Runs:
   ```
   docker run --rm \
     --network none \
     --memory 256m \
     --cpus 0.5 \
     --user 1000 \
     -v /tmp/sandbox-<id>:/code:ro \
     oven/bun:alpine \
     timeout <N> bun /code/code.[js|ts]
   ```
4. Captures stdout + stderr via `Bun.spawn`
5. Cleans up `/tmp/sandbox-<id>/` in `finally` (always runs)

Security constraints applied at the Docker level:
- `--network none` — no outbound network access
- `--memory 256m --cpus 0.5` — resource cap
- `-v .../code:ro` — filesystem is read-only inside the container
- `--user 1000` — runs as non-root

No custom image is needed — `oven/bun:alpine` natively executes both `.js` and `.ts` files via `bun`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SANDBOX_ENGINE_SECRET` | yes | Bearer token `apps/api` uses to authenticate — **must match `SANDBOX_ENGINE_SECRET` in api** |
| `SANDBOX_IMAGE` | no | Docker image to run code in (default `oven/bun:alpine`) |
| `PORT` | no | HTTP listen port (default 3003) |

## Development

```bash
bun run dev   # watch mode on port 3003
```

Requires Docker to be running. The host's Docker socket is used directly — no Docker-in-Docker.
