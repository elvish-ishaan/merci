import type { Metadata } from 'next'
import { CodeBlock } from '../_components/code-block'

export const metadata: Metadata = {
  title: 'Mercio — Serverless Functions — Mercy Docs',
  description:
    'Upload a JavaScript or TypeScript file and get a public invoke URL. Mercio runs your code inside an isolated workerd V8 process on every request — no servers, no config.',
}

export default function MercioPage() {
  return (
    <article>

      {/* Header */}
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <span className="text-brand-accent">~/</span>docs / mercio
      </p>
      <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
        Mercio
      </h1>
      <p className="mt-4 text-base text-brand-fg-subtle max-w-2xl">
        Serverless functions for the Mercy platform. Upload a zip of Node.js or TypeScript code and get back a public URL that executes your handler on every HTTP request inside an isolated{' '}
        <a
          href="https://github.com/cloudflare/workerd"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-fg-strong underline underline-offset-4 decoration-brand-border hover:decoration-brand-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          workerd
        </a>{' '}
        V8 process.
      </p>

      <hr className="border-brand-border my-10" />

      {/* Overview */}
      <section id="overview" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight mt-0">
          Overview
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Mercio is the serverless execution layer of Mercy. Each deployed function:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'Runs inside a dedicated workerd V8 isolate — fully separated from other functions, no shared globals or memory.',
            'Is bundled at upload time by esbuild, so you can use npm packages and TypeScript.',
            'Keeps a warm process in a pool so subsequent requests to the same function are served in single-digit milliseconds after the first.',
            'Supports any HTTP method. The same URL handles GET, POST, PATCH, DELETE, etc.',
            'Works with both a simple custom handler contract and the Hono web framework.',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand-accent mt-0.5 shrink-0">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <hr className="border-brand-border my-10" />

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          How it works
        </h2>
        <ol className="mt-6 space-y-6">
          {[
            {
              step: '01',
              title: 'Upload',
              body: 'POST /api/mercio/upload with a zip file and entry point. The API stores the zip in memory and pushes a mercio-builds job onto the BullMQ queue.',
            },
            {
              step: '02',
              title: 'Bundle',
              body: 'The Worker service picks up the build job, extracts the zip, and runs esbuild to produce a single worker.mjs bundle. The bundle is wrapped in a Cloudflare Workers-compatible shim (export default { async fetch(...) }) so workerd can execute it. The bundle is uploaded to R2 at mercio/<id>/worker.mjs.',
            },
            {
              step: '03',
              title: 'Invoke',
              body: 'When a request arrives at /mercio/:id, the API enqueues a mercio-invocations job with the full request context (method, path, query, headers, body) and waits for the result using BullMQ\'s waitUntilFinished.',
            },
            {
              step: '04',
              title: 'Execute',
              body: 'mercio-runtime dequeues the job. workerdPool.ensure(id) returns a warm workerd process (cold-starting from R2 if needed). The runtime forwards the request to the workerd process via loopback HTTP and collects the response.',
            },
            {
              step: '05',
              title: 'Respond',
              body: 'The result (status, headers, body) is returned as the BullMQ job value. The API\'s waitUntilFinished resolves and the original HTTP caller receives the response.',
            },
          ].map(({ step, title, body }) => (
            <li key={step} className="flex gap-5">
              <span className="font-mono-brand text-brand-accent text-sm shrink-0 w-6">{step}</span>
              <div>
                <p className="font-mono-brand text-sm text-brand-fg-strong">{title}</p>
                <p className="mt-1 text-sm text-brand-fg-subtle">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Quickstart */}
      <section id="quickstart" aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Quickstart
        </h2>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">1. Write your handler</h3>
        <CodeBlock filename="index.js">{`module.exports = async (req) => {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: req.query.name ?? 'world' }),
  }
}`}</CodeBlock>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">2. Zip and upload</h3>
        <CodeBlock language="bash">{`# create the zip
zip hello-world.zip index.js

# authenticate
TOKEN=$(curl -s -X POST https://api.yourdomain.com/auth/login \\
  -H 'content-type: application/json' \\
  -d '{"email":"you@example.com","password":"yourpassword"}' \\
  | jq -r .token)

# upload
curl -X POST https://api.yourdomain.com/api/mercio/upload \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "zip=@hello-world.zip" \\
  -F "name=hello-world" \\
  -F "entry=index.js"`}</CodeBlock>
        <p className="mt-2 text-xs text-brand-fg-muted">
          Response contains <code className="font-mono-brand">id</code>, <code className="font-mono-brand">status</code> (QUEUED), and <code className="font-mono-brand">invokeUrl</code>.
        </p>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">3. Poll until deployed</h3>
        <CodeBlock language="bash">{`ID="<function-id>"

curl -s -H "Authorization: Bearer $TOKEN" \\
  https://api.yourdomain.com/api/mercio/$ID | jq .function.status
# "QUEUED" → "BUILDING" → "DEPLOYED"`}</CodeBlock>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">4. Invoke</h3>
        <CodeBlock language="bash">{`curl "https://api.yourdomain.com/mercio/$ID?name=mercy"
# {"hello":"mercy"}`}</CodeBlock>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Handler contract */}
      <section id="handler-contract" aria-labelledby="contract-heading">
        <h2 id="contract-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Handler contract
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Your entry file must export (or <code className="font-mono-brand text-xs text-brand-fg-strong">module.exports</code>) an async function that receives a request object and returns a response object.
        </p>

        <h3 className="font-mono-brand text-sm text-brand-fg-muted mt-6 mb-3">Request (<code className="text-brand-fg-subtle">req</code>)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Field</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Type</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['method', 'string', 'HTTP method — "GET", "POST", etc.'],
                ['url', 'string', 'Full request URL'],
                ['path', 'string', 'Path component only'],
                ['headers', 'Record<string, string>', 'Request headers'],
                ['query', 'Record<string, string>', 'Parsed query string parameters'],
                ['body', 'string | object | null', 'Parsed JSON, raw text, or null for GET/HEAD'],
              ].map(([field, type, desc]) => (
                <tr key={field}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{field}</code></td>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-fg-muted">{type}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-mono-brand text-sm text-brand-fg-muted mt-8 mb-3">Return value</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Field</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Type</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['status', 'number', 'HTTP status code. Defaults to 200.'],
                ['headers', 'Record<string, string>', 'Response headers.'],
                ['body', 'string', 'Response body as a string — call JSON.stringify() yourself.'],
              ].map(([field, type, desc]) => (
                <tr key={field}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{field}</code></td>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-fg-muted">{type}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Hono */}
      <section id="hono" aria-labelledby="hono-heading">
        <h2 id="hono-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Hono support (recommended)
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          The{' '}
          <a
            href="https://hono.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-fg-strong underline underline-offset-4 decoration-brand-border hover:decoration-brand-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            Hono
          </a>{' '}
          web framework works natively in workerd and is the recommended way to build Mercio functions with routing, middleware, and typed responses.
        </p>
        <CodeBlock filename="index.ts">{`import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ ok: true }))

app.get('/hello/:name', (c) =>
  c.json({ message: \`Hello, \${c.req.param('name')}!\` })
)

app.post('/data', async (c) => {
  const body = await c.req.json()
  return c.json({ received: body })
})

export default app`}</CodeBlock>
        <p className="mt-3 text-sm text-brand-fg-subtle">Rules when using Hono:</p>
        <ul className="mt-3 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'Set "type": "module" in package.json and add hono as a dependency.',
            'Run npm install locally before zipping — esbuild resolves Hono from your local node_modules.',
            'Use entry=index.ts (or .js) when uploading.',
            'All Hono features work: routing, middleware, path params, c.json(), c.text(), etc.',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand-accent mt-0.5 shrink-0">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">Zip and upload a Hono function</h3>
        <CodeBlock language="bash">{`cd my-hono-app
npm install
zip -r ../my-hono-app.zip .

curl -X POST https://api.yourdomain.com/api/mercio/upload \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "zip=@../my-hono-app.zip" \\
  -F "name=my-hono-app" \\
  -F "entry=index.ts"`}</CodeBlock>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Configuration */}
      <section id="configuration" aria-labelledby="config-heading">
        <h2 id="config-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Configuration
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Set these in <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">apps/mercio-runtime/.env</code>.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Variable</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Default</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['REDIS_HOST', 'localhost', 'Redis host for BullMQ'],
                ['REDIS_PORT', '6379', 'Redis port'],
                ['R2_ENDPOINT', '—', 'Cloudflare R2 S3-compatible endpoint URL'],
                ['R2_ACCESS_KEY_ID', '—', 'R2 access key'],
                ['R2_SECRET_ACCESS_KEY', '—', 'R2 secret key'],
                ['R2_BUCKET_NAME', '—', 'R2 bucket name'],
                ['WORKERD_BIN', 'auto', 'Absolute path to the workerd binary (auto-resolved from npm package)'],
                ['MERCIO_CACHE_DIR', '/var/mercio', 'Directory for worker.mjs cache and capnp configs'],
                ['MERCIO_POOL_MAX', '20', 'Maximum simultaneous warm workerd processes'],
                ['MERCIO_IDLE_TTL_MS', '300000', 'Kill a process idle longer than this (5 min default)'],
              ].map(([name, def, desc]) => (
                <tr key={name}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{name}</code></td>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-fg-muted">{def}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Limits */}
      <section id="limits" aria-labelledby="limits-heading">
        <h2 id="limits-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Limits & constraints
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'Zip upload size: 50 MB maximum.',
            'No filesystem writes at runtime — workerd V8 isolates have no disk access. Read-only use of bundled assets is fine.',
            'State is in-memory and per-process. Do not rely on state surviving a cold start, a pool eviction, or a process crash.',
            'Pool max: 20 warm processes by default (MERCIO_POOL_MAX). Least-recently-used processes are evicted when the pool is full.',
            'Idle processes are killed after 5 minutes of inactivity (MERCIO_IDLE_TTL_MS).',
            'Concurrency: 8 invocation jobs execute simultaneously inside mercio-runtime (BullMQ worker concurrency).',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand-accent mt-0.5 shrink-0">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

    </article>
  )
}
