import Link from 'next/link'
import { CodeBlock } from '@/app/docs/_components/code-block'
import { MermaidDiagram } from '../_components/mermaid-diagram'

const systemOverview = `
graph TB
  subgraph Client
    C[HTTP Request]
  end
  subgraph API
    A[POST /mercio/id]
    AW[waitUntilFinished]
  end
  subgraph Queue
    Q[(mercio-invocations)]
    QE[QueueEvents]
  end
  subgraph Runtime
    W[BullMQ Worker]
    P[Worker Pool]
    WP1[workerd PID-A]
    WP2[workerd PID-B]
    WPN[workerd PID-N]
  end
  subgraph Storage
    R2[(R2 bucket)]
    Disk[(var/mercio disk cache)]
  end
  C -->|HTTP| A
  A -->|enqueue job| Q
  A -->|await result| AW
  AW -.->|listens| QE
  Q -->|dequeue| W
  W --> P
  P --> WP1
  P --> WP2
  P --> WPN
  WP1 -.->|worker.mjs| Disk
  Disk -.->|cache miss| R2
  W -->|return result| QE
  AW -->|HTTP response| C
`

const requestSequence = `
sequenceDiagram
  participant Caller as HTTP Caller
  participant API as apps/api
  participant Redis as Redis BullMQ
  participant Runtime as mercio-runtime
  participant Pool as Worker Pool
  participant Workerd as workerd V8
  participant R2 as Cloudflare R2

  Caller->>API: POST /mercio/functionId
  API->>Redis: enqueue invocation job
  API->>Redis: waitUntilFinished 30s

  Redis-->>Runtime: dequeue job

  alt warm - function already running
    Runtime->>Pool: ensure - cache hit
    Pool-->>Runtime: port number
  else cold start
    Runtime->>Pool: ensure - cache miss
    Pool->>Pool: check disk for worker.mjs
    alt disk cache miss
      Pool->>R2: GetObject worker.mjs
      R2-->>Pool: bundle bytes
      Pool->>Pool: write to disk
    end
    Pool->>Pool: generate config.capnp
    Pool->>Workerd: spawn workerd process
    Pool->>Pool: waitUntilReady
    Pool-->>Runtime: port number
  end

  Runtime->>Workerd: fetch 127.0.0.1/port/path
  Workerd->>Workerd: execute user handler
  Workerd-->>Runtime: status + headers + body

  Runtime->>Redis: complete job with result
  Redis-->>API: job result
  API-->>Caller: HTTP response
`

const poolStateMachine = `
stateDiagram-v2
  [*] --> Cold: first request for function

  Cold --> Spawning: ensure called
  Spawning --> Warm: waitUntilReady succeeds
  Spawning --> Cold: spawn fails

  Warm --> Warm: request served
  Warm --> Idle: idle past IDLE_TTL_MS
  Warm --> Evicted: pool full LRU eviction

  Idle --> Warm: new request arrives
  Idle --> Evicted: cleanup tick fires

  Evicted --> [*]: process killed
`

const r2CacheFlow = `
flowchart TD
  A[ensure functionId called] --> B{worker.mjs on disk?}
  B -->|yes| E[read from disk cache]
  B -->|no| C[GetObject from R2]
  C --> D[write to disk cache]
  D --> E
  E --> F[generate config.capnp]
  F --> G[spawn workerd process]
  G --> H[waitUntilReady on ephemeral port]
  H --> I[add to pool map]
`

const concurrencyDiagram = `
graph LR
  subgraph BullMQWorker["BullMQ Worker - concurrency 8"]
    J1["Job 1 - fn-A"]
    J2["Job 2 - fn-B"]
    J3["Job 3 - fn-A"]
    J4["Job 4 - fn-C"]
    J5["Job 5 - fn-D"]
  end
  subgraph Pool["Worker Pool - max 20 processes"]
    W1["workerd fn-A :PORT_A"]
    W2["workerd fn-B :PORT_B"]
    W3["workerd fn-C :PORT_C"]
    W4["workerd fn-D :PORT_D"]
  end
  J1 -->|"-> PORT_A"| W1
  J3 -->|"-> PORT_A"| W1
  J2 -->|"-> PORT_B"| W2
  J4 -->|"-> PORT_C"| W3
  J5 -->|"-> PORT_D"| W4
`

function Heading2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight mt-14 mb-4 scroll-mt-20"
    >
      {children}
    </h2>
  )
}

function Heading3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="font-mono-brand text-lg text-brand-fg-strong mt-8 mb-3 scroll-mt-20"
    >
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-brand-fg-subtle leading-relaxed mb-4">{children}</p>
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-inside space-y-2 text-brand-fg-subtle mb-4 pl-2">
      {children}
    </ul>
  )
}

function LI({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono-brand text-sm text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">
      {children}
    </code>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-brand-accent bg-brand-surface rounded-r-lg px-5 py-4 my-6 text-sm text-brand-fg-subtle leading-relaxed">
      {children}
    </div>
  )
}

function EnvTable({
  rows,
}: {
  rows: { name: string; default: string; description: string }[]
}) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-brand-border">
            <th className="font-mono-brand text-left text-brand-fg-muted py-2 pr-6">Variable</th>
            <th className="font-mono-brand text-left text-brand-fg-muted py-2 pr-6">Default</th>
            <th className="font-mono-brand text-left text-brand-fg-muted py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-brand-border last:border-0">
              <td className="py-2.5 pr-6">
                <InlineCode>{r.name}</InlineCode>
              </td>
              <td className="py-2.5 pr-6 font-mono-brand text-xs text-brand-fg-muted">
                {r.default || '—'}
              </td>
              <td className="py-2.5 text-brand-fg-subtle">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MercioRuntimePost() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      {/* Breadcrumb */}
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <Link href="/blog" className="hover:text-brand-accent transition-colors">
          ~/blog
        </Link>
        <span className="mx-2 text-brand-border">/</span>
        <span className="text-brand-fg-subtle">mercio-runtime</span>
      </p>

      {/* Header */}
      <header className="mt-4 mb-12">
        <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
          Inside mercio-runtime: How Mercy Executes Serverless Functions
        </h1>
        <div className="flex flex-wrap gap-4 items-center mt-5">
          <time
            dateTime="2026-06-01"
            className="font-mono-brand text-sm text-brand-fg-muted"
          >
            June 1, 2026
          </time>
          <span className="text-brand-border">·</span>
          <span className="font-mono-brand text-sm text-brand-fg-muted">18 min read</span>
          <span className="text-brand-border">·</span>
          <span className="font-mono-brand text-sm text-brand-fg-muted">Mercy Engineering</span>
        </div>
        <ul className="flex flex-wrap gap-2 mt-4">
          {['serverless', 'workerd', 'v8', 'bullmq', 'architecture'].map((tag) => (
            <li
              key={tag}
              className="font-mono-brand text-xs text-brand-fg-muted bg-brand-surface-2 border border-brand-border rounded px-2 py-0.5"
            >
              {tag}
            </li>
          ))}
        </ul>
      </header>

      {/* Introduction */}
      <Heading2 id="introduction">Introduction</Heading2>
      <P>
        When you upload a JavaScript function to Mercy and hit its invoke URL, something has to
        actually run your code. That something is <InlineCode>mercio-runtime</InlineCode> — a lean,
        Bun-based service that manages a warm pool of{' '}
        <InlineCode>workerd</InlineCode> V8 isolates, routes HTTP invocations through BullMQ,
        and caches compiled bundles on local disk so cold starts happen at most once per function.
      </P>
      <P>
        This post is a deep technical walk-through of its internals. We will cover the process
        lifecycle, the worker pool algorithm, how Cap'n Proto configuration is generated on the
        fly, why we chose BullMQ for the invocation layer, and how all of this fits together
        inside Docker. By the end you will understand exactly what happens — at every layer —
        between a caller sending an HTTP request and receiving a response.
      </P>
      <Callout>
        Prerequisites: familiarity with Node.js/Bun event loops, Docker networking, and a
        high-level understanding of Redis job queues. Knowledge of Cap'n Proto or workerd is not
        required.
      </Callout>

      {/* System Architecture */}
      <Heading2 id="architecture">System Architecture</Heading2>
      <P>
        Mercy's Mercio product spans four major services. Understanding where
        <InlineCode>mercio-runtime</InlineCode> sits in that landscape is the right starting point.
      </P>
      <MermaidDiagram
        chart={systemOverview}
        caption="Figure 1 — Full system overview. The runtime consumes jobs from the BullMQ queue and proxies them to warm workerd processes."
      />
      <P>The four services and their responsibilities:</P>
      <UL>
        <LI>
          <strong className="text-brand-fg-strong">apps/api</strong> — Receives the incoming HTTP
          request, enqueues an invocation job, and blocks waiting for the result via
          <InlineCode>QueueEvents.waitUntilFinished</InlineCode>.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Redis / BullMQ</strong> — Acts as the
          invocation broker. The <InlineCode>mercio-invocations</InlineCode> queue decouples the
          API from the runtime and provides back-pressure, retry semantics, and observability.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">apps/mercio-runtime</strong> — This service.
          Consumes invocation jobs, maintains the workerd pool, and forwards HTTP traffic to the
          correct isolate.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">apps/worker</strong> — A separate build
          pipeline that takes user-uploaded zip files, runs esbuild, and uploads the resulting
          <InlineCode>worker.mjs</InlineCode> bundle to Cloudflare R2. The runtime never touches
          raw user code.
        </LI>
      </UL>

      {/* Request Lifecycle */}
      <Heading2 id="request-lifecycle">The Request Lifecycle</Heading2>
      <P>
        Let us trace a single invocation end-to-end, from the moment the caller's HTTP request
        hits the API to the moment the response arrives back.
      </P>
      <MermaidDiagram
        chart={requestSequence}
        caption="Figure 2 — Sequence diagram of a complete function invocation, showing both warm (cache hit) and cold start paths."
      />

      <Heading3>Step 1 — API enqueues the job</Heading3>
      <P>
        The API handler at <InlineCode>POST /mercio/:id</InlineCode> serialises the full HTTP
        context — method, path, query string, headers, and body — into a BullMQ job payload and
        adds it to the <InlineCode>mercio-invocations</InlineCode> queue. It then calls
        <InlineCode>QueueEvents.waitUntilFinished(jobId, 30_000)</InlineCode>, which subscribes
        to a Redis Pub/Sub channel and blocks the request handler until the job emits a
        <InlineCode>completed</InlineCode> event or the 30-second timeout fires.
      </P>

      <Heading3>Step 2 — Runtime dequeues and routes</Heading3>
      <P>
        The BullMQ Worker inside <InlineCode>mercio-runtime</InlineCode> pulls the job off the
        queue (up to 8 concurrent jobs at once) and calls <InlineCode>ensure(functionId)</InlineCode>
        on the worker pool. If the function is already warm the call returns immediately with a
        port number. If it is cold, the pool starts a spawn sequence (described in detail below).
      </P>

      <Heading3>Step 3 — HTTP proxy to workerd</Heading3>
      <P>
        Once a port is known, the runtime issues a standard
        <InlineCode>fetch</InlineCode> to{' '}
        <InlineCode>http://127.0.0.1:{'{port}'}{'{path}'}</InlineCode>, forwarding all headers and
        the request body. workerd receives this, executes the user's handler, and returns a
        standard HTTP response. The runtime reads the response status, headers, and body, then
        completes the BullMQ job with those values as the return value.
      </P>

      <Heading3>Step 4 — API unblocks and responds</Heading3>
      <P>
        The <InlineCode>waitUntilFinished</InlineCode> call in the API resolves with the job
        return value, which is forwarded directly as the HTTP response to the original caller.
        The entire round trip — excluding cold start — is typically under 10 ms of overhead on
        top of the user function's own execution time.
      </P>

      {/* workerd */}
      <Heading2 id="workerd">workerd: Cloudflare's V8 Sandbox</Heading2>
      <P>
        <InlineCode>workerd</InlineCode> is Cloudflare's open-source serverless runtime — the
        same engine that powers Cloudflare Workers in production. It exposes each function as
        an isolated V8 context inside a separate OS process, preventing cross-function memory
        sharing entirely. Key properties that made it the right choice for Mercy:
      </P>
      <UL>
        <LI>
          <strong className="text-brand-fg-strong">Process-level isolation</strong> — each
          function runs in its own OS process. A crash or OOM in one function cannot affect
          another.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Node.js compatibility flag</strong> — the
          <InlineCode>nodejs_compat</InlineCode> compatibility flag enables Node.js built-in shims
          (<InlineCode>node:fs</InlineCode>, <InlineCode>node:crypto</InlineCode>,
          <InlineCode>node:path</InlineCode>, etc.) inside the V8 context, so most npm packages
          work without extra polyfills.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">HTTP socket binding</strong> — workerd opens
          a TCP socket and serves HTTP natively, making the proxy model trivial to implement.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">npm distribution</strong> — the workerd
          binary ships as an npm package, so <InlineCode>bun install</InlineCode> in the
          Dockerfile automatically downloads the correct Linux binary for the target architecture.
        </LI>
      </UL>

      {/* Cap'n Proto */}
      <Heading2 id="capnp">Cap'n Proto Worker Configuration</Heading2>
      <P>
        workerd is configured via Cap'n Proto schema files (<InlineCode>.capnp</InlineCode>),
        not command-line flags or environment variables. The runtime generates one config file
        per function, stored at{' '}
        <InlineCode>/var/mercio/{'{functionId}'}/config.capnp</InlineCode>. Here is exactly
        what that file looks like:
      </P>
      <CodeBlock filename="config.capnp" language="capnp">
        {`using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .mercioWorker),
  ],
  sockets = [
    (
      name    = "http",
      address = "127.0.0.1:PORT",
      http    = (),
      service = "main",
    ),
  ],
);

const mercioWorker :Workerd.Worker = (
  modules = [
    (name = "worker", esModule = embed "worker.mjs"),
  ],
  compatibilityDate  = "2025-01-01",
  compatibilityFlags = ["nodejs_compat"],
);`}
      </CodeBlock>
      <P>
        The <InlineCode>embed "worker.mjs"</InlineCode> directive instructs workerd to read the
        bundle from the filesystem at startup. The port is determined at runtime by asking the OS
        for a free ephemeral port — the runtime calls a helper that binds then immediately closes
        a TCP socket to obtain an available port before writing the config.
      </P>
      <Callout>
        The <InlineCode>compatibilityDate</InlineCode> pins behaviour to a specific date-based
        version of the workerd runtime. Newer features become available by advancing this date;
        the date chosen (2025-01-01) activates a broad set of stable Node.js compatibility
        shims.
      </Callout>

      {/* Worker Pool */}
      <Heading2 id="worker-pool">Worker Pool: Warm vs Cold Starts</Heading2>
      <P>
        The key insight behind mercio-runtime's performance is that workerd processes are
        <em className="text-brand-fg-strong"> kept alive between requests</em>. A cold start
        happens at most once per function per pool eviction cycle. Every subsequent request to
        the same function hits a warm process.
      </P>
      <MermaidDiagram
        chart={poolStateMachine}
        caption="Figure 3 — State machine for a single workerd process managed by the pool."
      />

      <Heading3>Cold start path</Heading3>
      <P>
        When <InlineCode>ensure(functionId)</InlineCode> is called and no entry exists in the
        pool map, the runtime:
      </P>
      <UL>
        <LI>Checks the disk cache at <InlineCode>/var/mercio/{'{functionId}'}/worker.mjs</InlineCode>.</LI>
        <LI>If absent, downloads the bundle from Cloudflare R2 and writes it to disk.</LI>
        <LI>Generates the <InlineCode>config.capnp</InlineCode> file with a fresh ephemeral port.</LI>
        <LI>Spawns a workerd child process via <InlineCode>Bun.spawn</InlineCode>.</LI>
        <LI>
          Polls <InlineCode>http://127.0.0.1:{'{port}'}/</InlineCode> in a tight loop until a
          non-error response arrives (<InlineCode>waitUntilReady</InlineCode>).
        </LI>
        <LI>Stores <InlineCode>{'{port, process, lastUsed}'}</InlineCode> in the pool map.</LI>
      </UL>
      <P>
        This whole sequence takes roughly 150–400 ms depending on whether the disk cache is
        warm and how quickly workerd starts up. Every subsequent invocation skips all of this.
      </P>

      <Heading3>LRU eviction</Heading3>
      <P>
        The pool is bounded by <InlineCode>MERCIO_POOL_MAX</InlineCode> (default 20). When a
        new cold start would exceed this limit, the pool finds the entry with the oldest
        <InlineCode>lastUsed</InlineCode> timestamp, sends SIGTERM to its process, and removes
        it from the map. This is a synchronous eviction — no async waiting — so the new spawn
        can proceed immediately.
      </P>

      <Heading3>Idle timeout</Heading3>
      <P>
        A cleanup task runs every 60 seconds. It iterates the pool map and kills any process
        whose <InlineCode>lastUsed</InlineCode> timestamp is older than{' '}
        <InlineCode>MERCIO_IDLE_TTL_MS</InlineCode> (default 5 minutes). This reclaims memory
        for functions that haven't been invoked recently without waiting for the pool to fill up.
      </P>

      {/* R2 Caching */}
      <Heading2 id="r2-caching">R2 Storage and Local Disk Cache</Heading2>
      <P>
        User function bundles live in Cloudflare R2 — an S3-compatible object store. The runtime
        uses the AWS SDK's <InlineCode>S3Client</InlineCode> with the R2 endpoint to download
        them. But downloading a bundle on every cold start would be wasteful; instead, bundles
        are cached on a Docker volume at <InlineCode>/var/mercio</InlineCode>.
      </P>
      <MermaidDiagram
        chart={r2CacheFlow}
        caption="Figure 4 — Bundle resolution: disk cache checked first, R2 fetched only on a miss."
      />
      <P>
        The Docker volume (<InlineCode>mercio_cache:/var/mercio</InlineCode>) persists across
        container restarts. In practice this means that after the first cold start for a given
        function, subsequent cold starts — even after a runtime container restart — skip the R2
        download entirely.
      </P>
      <P>
        Cache invalidation happens at the application layer: when a user redeploys a function,
        the build pipeline uploads a new <InlineCode>worker.mjs</InlineCode> under the same key
        in R2 and the cached disk file is removed so the next cold start fetches the fresh
        bundle. The function ID embedded in the path acts as the cache key.
      </P>

      {/* BullMQ */}
      <Heading2 id="bullmq">BullMQ Job Schema and Concurrency Model</Heading2>
      <P>
        The invocation job payload that flows through the queue carries everything the runtime
        needs to execute and log the request:
      </P>
      <CodeBlock language="typescript">
        {`type InvocationJobData = {
  id: string          // function (mercio) ID
  method: string      // HTTP method
  path: string        // request path
  query: string       // raw query string
  headers: Record<string, string>
  body: string        // serialised request body
  runId?: string      // present when invoked via a Mercob scheduled job
  timeoutMs?: number  // per-invocation timeout override
}`}
      </CodeBlock>
      <P>
        The BullMQ Worker is configured with <InlineCode>concurrency: 8</InlineCode>, meaning up
        to eight jobs can be processed simultaneously within a single runtime instance. Each job
        runs as an independent async task; there is no shared mutable state between them (the
        pool map access is synchronous and never interleaved due to JavaScript's single-threaded
        event loop).
      </P>
      <MermaidDiagram
        chart={concurrencyDiagram}
        caption="Figure 5 — Multiple concurrent jobs sharing warm workerd processes. Two jobs for fn-A route to the same process; workerd queues them internally."
      />
      <Callout>
        workerd processes a given function's requests serially — it has a single-threaded V8
        event loop per isolate. Concurrent calls to the same function will queue up inside the
        single workerd process for that function. If you need true parallel execution for a
        single function you would need to run multiple runtime instances (horizontal scaling).
      </Callout>

      <Heading3>Why BullMQ over direct HTTP?</Heading3>
      <P>
        The indirection through a job queue gives us several properties that a direct HTTP call
        from the API to the runtime would not:
      </P>
      <UL>
        <LI>
          <strong className="text-brand-fg-strong">Back-pressure</strong> — if all 8 worker
          slots are busy, new jobs queue in Redis rather than piling up as in-flight HTTP
          connections.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Retries</strong> — transient failures
          (workerd crash, network blip) are automatically retried by BullMQ without the caller
          noticing.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Observability</strong> — the queue's
          waiting/active/completed/failed counts are available in real time, making it easy to
          spot bottlenecks.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Horizontal scaling</strong> — adding more
          runtime instances is a matter of deploying another container; they all consume from
          the same queue without any co-ordination.
        </LI>
      </UL>

      {/* Job Logging */}
      <Heading2 id="job-logging">Job Logging and the runId Flow</Heading2>
      <P>
        When a Mercio function is invoked by a Mercob scheduled job, the invocation payload
        includes a <InlineCode>runId</InlineCode>. After the workerd execution completes, the
        runtime POSTs the execution result (status, headers, truncated body, and duration) back
        to the API at <InlineCode>/internal/job-logs</InlineCode> with a Bearer token
        (<InlineCode>WORKER_SECRET</InlineCode>) for authentication.
      </P>
      <P>
        This is what populates the per-run history visible in the Mercy dashboard. Direct
        invocations (those without a <InlineCode>runId</InlineCode>) skip this step — the
        result is returned entirely through the BullMQ job return value and never persisted.
      </P>

      {/* Graceful Shutdown */}
      <Heading2 id="graceful-shutdown">Graceful Shutdown</Heading2>
      <P>
        Docker sends SIGTERM when stopping a container. The runtime's entry point registers a
        handler:
      </P>
      <CodeBlock filename="index.ts" language="typescript">
        {`process.on('SIGINT', async () => {
  logger.info('mercio-runtime shutting down')
  await worker.close()  // drain BullMQ, no new jobs accepted
  process.exit(0)
})`}
      </CodeBlock>
      <P>
        <InlineCode>worker.close()</InlineCode> tells BullMQ to finish any currently executing
        jobs before resolving. workerd child processes receive SIGTERM implicitly when the parent
        Bun process exits. Because the docker-compose restart policy is{' '}
        <InlineCode>unless-stopped</InlineCode>, the runtime will restart automatically after
        any non-zero exit — but the graceful drain ensures in-flight invocations complete first.
      </P>

      {/* Conclusion */}
      <Heading2 id="conclusion">Conclusion</Heading2>
      <P>
        <InlineCode>mercio-runtime</InlineCode> is a small service with a focused job: keep
        user functions warm and get invocations through with minimal latency. The design centres
        on a few deliberate choices — one workerd process per function rather than shared
        isolates, BullMQ for back-pressure and retries instead of direct HTTP, and a persistent
        disk cache so R2 is hit as rarely as possible.
      </P>
      <P>
        Together these choices let the runtime stay simple (~300 lines of TypeScript across four
        files) while delivering sub-10ms overhead on warm invocations and full V8-level isolation
        between functions. As Mercy scales, the horizontal scaling story is equally simple: add
        more runtime containers and they all share the same Redis queue with zero configuration.
      </P>
      <P>
        If you want to dig further into the source code, explore the{' '}
        <Link href="/docs/mercio" className="text-brand-accent hover:underline">
          Mercio documentation
        </Link>{' '}
        or browse the example functions in{' '}
        <InlineCode>apps/mercio-runtime/example/</InlineCode> to see the handler contract in
        action.
      </P>

      {/* Back link */}
      <div className="mt-16 pt-8 border-t border-brand-border">
        <Link
          href="/blog"
          className="font-mono-brand text-sm text-brand-fg-muted hover:text-brand-accent transition-colors"
        >
          ← All posts
        </Link>
      </div>
    </article>
  )
}
