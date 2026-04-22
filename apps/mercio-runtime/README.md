# mercio-runtime

Runtime service for Mercio — the serverless function layer of the mercy platform. Consumes invocation jobs from a BullMQ queue, routes each request into an isolated [workerd](https://github.com/cloudflare/workerd) V8 process, and returns the result to the waiting HTTP caller.

---

## Overview

Mercio lets users upload a zip of Node.js code and get back a public URL that executes their function on every request. This service handles the execution half of that flow: it knows nothing about uploads or builds — it only runs already-built bundles.

```
HTTP caller
    │
    ▼
apps/api  ──  POST /mercio/:id  ──►  BullMQ: mercio-invocations
                                              │
                                              ▼
                                     mercio-runtime (this service)
                                              │
                                    ┌─────────┴──────────┐
                                    │  workerd pool       │
                                    │  id → {proc, port}  │
                                    └─────────┬──────────┘
                                              │  HTTP (loopback)
                                              ▼
                                         workerd process
                                         (V8 isolate)
                                              │
                                              ▼
                                         user's worker.mjs
                                         (bundled handler)
                                              │
                                    result: {status, headers, body}
                                              │
                                              ▼
                                    BullMQ job return value
                                              │
                                              ▼
                                     apps/api  ──►  HTTP caller
```

The API side uses `QueueEvents.waitUntilFinished(jobId, 30_000)` so each HTTP caller is correlated to exactly one job by BullMQ's jobId — no cross-talk between concurrent requests.

---

## How a request flows through this service

1. **Dequeue** — BullMQ delivers an `invoke` job with `{ id, method, path, query, headers, body }`.
2. **Pool lookup** — `workerdPool.ensure(id)` checks an in-memory LRU map keyed by function id.
   - **Cache hit** — refresh `lastUsedAt`, return the existing `{ port }`.
   - **Cache miss** — cold start: fetch `worker.mjs` from R2 → write capnp config → `Bun.spawn(workerd serve config.capnp)` → poll loopback until accepting connections.
3. **Execute** — `fetch(`http://127.0.0.1:{port}{path}{qs}`, { method, headers, body })` into the warm workerd process.
4. **Return** — collect `{ status, headers, body }` from the workerd response and return it as the BullMQ job result.
5. **API delivers** — `job.waitUntilFinished(queueEvents)` resolves in the API process; the HTTP response is sent to the original caller.

---

## Handler contract

User code must be in a file that exports a Node-style async handler:

```js
// index.js (user's entry file)
module.exports = async (req) => {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: req.query.name ?? 'world' }),
  }
}
```

The `req` object shape:

| Field     | Type                       | Description                                          |
|-----------|----------------------------|------------------------------------------------------|
| `method`  | `string`                   | HTTP method (`GET`, `POST`, …)                       |
| `url`     | `string`                   | Full request URL                                     |
| `path`    | `string`                   | Path component only                                  |
| `headers` | `Record<string, string>`   | Request headers                                      |
| `query`   | `Record<string, string>`   | Parsed query-string parameters                       |
| `body`    | `string \| object \| null` | Parsed JSON body or raw text; null for GET/HEAD      |

The return value shape:

| Field     | Type                     | Description                          |
|-----------|--------------------------|--------------------------------------|
| `status`  | `number`                 | HTTP status code (default `200`)     |
| `headers` | `Record<string, string>` | Response headers                     |
| `body`    | `string`                 | Response body as a string            |

---

## The workerd shim

User code speaks the Node handler contract above, but workerd expects a Cloudflare Workers-style `fetch(Request): Response` export. The build step (in `apps/worker`) wraps the user bundle with a shim:

```js
// generated shim — bundled into worker.mjs at build time
import handler from './user-entry.js'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const req = {
      method: request.method,
      url: request.url,
      path: url.pathname,
      headers: Object.fromEntries(request.headers),
      query: Object.fromEntries(url.searchParams),
      body: /* parsed from request body */,
    }
    const r = await handler(req)
    return new Response(r.body ?? '', {
      status: r.status ?? 200,
      headers: r.headers ?? {},
    })
  }
}
```

The resulting `worker.mjs` is stored in R2 at `mercio/<id>/worker.mjs` and is what this service downloads and loads.

---

## workerd process pool

Each deployed function gets at most one warm workerd process at a time. The pool is managed in `src/workerdPool.ts`.

```
pool: Map<functionId, { proc, port, lastUsedAt }>

ensure(id):
  hit  → bump lastUsedAt → return port
  miss → evict LRU if pool at max
       → fetch worker.mjs from R2 (or disk cache)
       → write /var/mercio/<id>/config.capnp
       → Bun.spawn(['workerd', 'serve', 'config.capnp'])
       → poll 127.0.0.1:<ephemeralPort> until accepting
       → store in pool → return port

sweep (every 60s):
  kill any entry where now - lastUsedAt > IDLE_TTL_MS
```

**Why one process per deployment, not one per request?**
Cold-starting workerd takes ~100–200ms. Keeping a warm process means subsequent requests to the same function are served in single-digit milliseconds after the first.

**Why not one shared workerd serving all functions?**
workerd's dynamic dispatch (Workers for Platforms) requires an enterprise capnp feature. One process per deployment is simpler and still gives full V8 isolate isolation between functions — no shared globals, no memory bleed between tenants.

---

## capnp config

Each deployment gets a generated capnp config file written to disk at first invoke:

```capnp
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .mercioWorker),
  ],
  sockets = [
    (name = "http", address = "127.0.0.1:<port>", http = (), service = "main"),
  ],
);

const mercioWorker :Workerd.Worker = (
  modules = [
    (name = "worker", esModule = embed "/var/mercio/<id>/worker.mjs"),
  ],
  compatibilityDate = "2025-01-01",
  compatibilityFlags = ["nodejs_compat"],
);
```

`nodejs_compat` enables Node.js built-in shims (`node:fs`, `node:path`, `node:crypto`, etc.) inside the V8 isolate, which allows most npm packages that reference Node APIs to work without bundling polyfills.

---

## File layout on disk

```
/var/mercio/               (MERCIO_CACHE_DIR)
  <functionId>/
    worker.mjs             downloaded from R2 on first invoke, cached for reuse
    config.capnp           generated per workerd spawn
```

In Docker, `/var/mercio` is a named volume (`mercio_cache`) so cached bundles survive container restarts without re-fetching from R2.

---

## Concurrency model

```
mercio-runtime process (Bun)
  └── BullMQ Worker  concurrency=8
        ├── job 1 → ensure(idA) → fetch http://127.0.0.1:PORTA/path
        ├── job 2 → ensure(idB) → fetch http://127.0.0.1:PORTB/path
        ├── job 3 → ensure(idA) → pool hit, reuse PORTA
        └── ...

workerd process A  (for idA)  ← single-threaded V8 event loop
workerd process B  (for idB)  ← single-threaded V8 event loop
```

- Up to 8 invocation jobs execute concurrently inside this Bun process.
- Each workerd process runs a single-threaded V8 event loop and queues concurrent requests internally.
- True isolation: separate OS processes, no shared memory between functions.
- If a function crashes workerd, only that process is affected. The dead pool entry is replaced on the next `ensure` call.

---

## Environment variables

| Variable               | Default                              | Description                                      |
|------------------------|--------------------------------------|--------------------------------------------------|
| `REDIS_HOST`           | `localhost`                          | Redis host for BullMQ                            |
| `REDIS_PORT`           | `6379`                               | Redis port                                       |
| `R2_ENDPOINT`          | —                                    | Cloudflare R2 S3-compatible endpoint URL         |
| `R2_ACCESS_KEY_ID`     | —                                    | R2 access key                                    |
| `R2_SECRET_ACCESS_KEY` | —                                    | R2 secret key                                    |
| `R2_BUCKET_NAME`       | —                                    | R2 bucket name                                   |
| `WORKERD_BIN`          | auto-resolved via `workerd` package  | Absolute path to the workerd binary              |
| `MERCIO_CACHE_DIR`     | `/var/mercio`                        | Directory for worker.mjs cache and capnp configs |
| `MERCIO_POOL_MAX`      | `20`                                 | Max simultaneous warm workerd processes          |
| `MERCIO_IDLE_TTL_MS`   | `300000` (5 min)                     | Kill a process idle longer than this             |

---

## Source layout

```
apps/mercio-runtime/
  index.ts            entry point — starts BullMQ worker, handles SIGINT
  src/
    runtime.ts        BullMQ Worker definition for mercio-invocations queue
    workerdPool.ts    LRU pool: spawn/reuse/evict workerd child processes
    r2.ts             R2 client + ensureWorkerMjs() disk cache helper
  package.json
  tsconfig.json
```

---

## Relation to other services

| Service       | Role in Mercio                                                        |
|---------------|-----------------------------------------------------------------------|
| `apps/api`    | Receives HTTP request, enqueues invocation job, awaits job result     |
| `apps/worker` | Builds user zip → esbuild bundle → uploads `worker.mjs` to R2        |
| `apps/mercio-runtime` | **This service** — runs the bundle inside a workerd isolate   |
| `@repo/db`    | Prisma schema owns `MercioFunction` table; runtime only reads R2      |
