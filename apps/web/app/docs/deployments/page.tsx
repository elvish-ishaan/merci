import type { Metadata } from 'next'
import { CodeBlock } from '../_components/code-block'

export const metadata: Metadata = {
  title: 'Deployments — Mercy Docs',
  description:
    'Deploy static sites from any Git repository. Mercy clones your repo, builds it in Docker, streams real-time logs, and serves it on a subdomain with auto HTTPS.',
}

export default function DeploymentsPage() {
  return (
    <article className="prose-none">

      {/* Header */}
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <span className="text-brand-accent">~/</span>docs / deployments
      </p>
      <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
        Deployments
      </h1>
      <p className="mt-4 text-base text-brand-fg-subtle max-w-2xl">
        Connect a GitHub repo (or paste any public URL) and Mercy takes care of everything: cloning, building inside Docker, streaming logs to your browser, uploading the build output to Cloudflare R2, and serving it instantly on a subdomain with automatic HTTPS.
      </p>

      <hr className="border-brand-border my-10" />

      {/* Overview */}
      <section id="overview" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight mt-0">
          Overview
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Mercy deployments are designed for frontend projects — static sites, SPAs, and any framework that produces an output directory. Every deployment gets:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'An isolated Docker build environment — your repo never touches shared infra.',
            'Real-time build log streaming via WebSocket, replayed from the database on reconnect.',
            'Assets stored in Cloudflare R2 — globally distributed, low-latency delivery.',
            'A unique subdomain (e.g. my-app.yourdomain.com) provisioned automatically.',
            'Support for per-deployment environment variables, AES-encrypted at rest.',
            'Custom domain attachment with CNAME verification and on-demand TLS via Caddy.',
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
        <p className="mt-3 text-sm text-brand-fg-subtle">
          From a POST request to a live URL, here is the full journey:
        </p>
        <ol className="mt-6 space-y-6">
          {[
            {
              step: '01',
              title: 'Job enqueued',
              body: 'The API receives your deploy request, creates a Project record in Postgres, and pushes a job onto the deploy-jobs BullMQ queue in Redis.',
            },
            {
              step: '02',
              title: 'Clone & build',
              body: 'The Worker service picks up the job, clones the repository using simple-git, then runs your build command inside a Docker container with Node.js. stdout and stderr are piped line-by-line to the API\'s /internal/logs endpoint.',
            },
            {
              step: '03',
              title: 'Log streaming',
              body: 'Each log line is persisted to the BuildLog table in Postgres and published to a Redis pub/sub channel (build:<projectId>). The WebSocket service is subscribed to that channel and forwards every line to all connected browser clients in real time.',
            },
            {
              step: '04',
              title: 'Upload & serve',
              body: 'Once the build succeeds, the Worker recursively uploads the output directory to Cloudflare R2 under a project-specific prefix. The API updates the Project status to DEPLOYED and sets the subdomain. Subsequent requests to <subdomain>.yourdomain.com are proxied by the API to R2.',
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
        <p className="mt-3 text-sm text-brand-fg-subtle">
          The fastest way to deploy is through the dashboard at{' '}
          <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">
            /dashboard
          </code>
          . Or use the API directly:
        </p>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">1. Authenticate</h3>
        <CodeBlock language="bash">{`curl -s -X POST https://api.yourdomain.com/auth/login \\
  -H 'content-type: application/json' \\
  -d '{"email":"you@example.com","password":"yourpassword"}' \\
  | jq -r .token`}</CodeBlock>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">2. Create a deployment</h3>
        <CodeBlock language="bash">{`TOKEN="<your-jwt>"

curl -X POST https://api.yourdomain.com/deploy \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "content-type: application/json" \\
  -d '{
    "repoUrl": "https://github.com/your-org/your-site",
    "projectName": "my-site"
  }'`}</CodeBlock>
        <p className="mt-2 text-xs text-brand-fg-muted">
          Response includes <code className="font-mono-brand">id</code> (projectId) and initial status <code className="font-mono-brand">QUEUED</code>.
        </p>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">3. Poll status</h3>
        <CodeBlock language="bash">{`PROJECT_ID="<project-id>"

curl -s -H "Authorization: Bearer $TOKEN" \\
  https://api.yourdomain.com/deploy/$PROJECT_ID \\
  | jq .project.status
# "QUEUED" → "CLONING" → "BUILDING" → "DEPLOYED"`}</CodeBlock>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">4. Add environment variables (optional)</h3>
        <CodeBlock language="bash">{`curl -X POST https://api.yourdomain.com/deploy/$PROJECT_ID/envvars \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"key": "NEXT_PUBLIC_API_URL", "value": "https://api.yourdomain.com"}'`}</CodeBlock>
        <p className="mt-2 text-xs text-brand-fg-muted">
          Env var values are AES-encrypted before storage. They are injected into the Docker build environment at build time.
        </p>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Environment Variables */}
      <section id="env-vars" aria-labelledby="env-vars-heading">
        <h2 id="env-vars-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Environment variables reference
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          These are the server-side variables required to run the deployment pipeline. Set them in <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">apps/api/.env</code> and <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">apps/worker/.env</code>.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Variable</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Service</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Required</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['DATABASE_URL', 'api, worker', 'yes', 'PostgreSQL connection string'],
                ['JWT_SECRET', 'api', 'yes', 'JWT signing key, 32+ chars'],
                ['WORKER_SECRET', 'api, worker', 'yes', 'Shared secret for internal API routes'],
                ['REDIS_HOST', 'api, worker', 'yes', 'Redis hostname'],
                ['REDIS_PORT', 'api, worker', 'no', 'Redis port (default 6379)'],
                ['R2_ENDPOINT', 'api, worker', 'yes', 'Cloudflare R2 S3-compatible endpoint'],
                ['R2_ACCESS_KEY_ID', 'api, worker', 'yes', 'R2 access key'],
                ['R2_SECRET_ACCESS_KEY', 'api, worker', 'yes', 'R2 secret key'],
                ['R2_BUCKET_NAME', 'api, worker', 'yes', 'R2 bucket name'],
                ['ENV_ENCRYPTION_KEY', 'api', 'yes', '64-char hex key for env var encryption'],
                ['BASE_DOMAIN', 'api', 'no', 'Apex domain for subdomain routing (default localhost)'],
                ['GITHUB_CLIENT_ID', 'api', 'no', 'GitHub OAuth app client ID'],
                ['GITHUB_CLIENT_SECRET', 'api', 'no', 'GitHub OAuth app client secret'],
                ['API_BASE_URL', 'worker', 'no', 'API base URL (default http://localhost:3001)'],
              ].map(([name, service, req, desc]) => (
                <tr key={name}>
                  <td className="py-3 pr-6">
                    <code className="font-mono-brand text-xs text-brand-accent">{name}</code>
                  </td>
                  <td className="py-3 pr-6 text-xs text-brand-fg-muted font-mono-brand">{service}</td>
                  <td className="py-3 pr-6">
                    <span className={`font-mono-brand text-xs ${req === 'yes' ? 'text-brand-fg-strong' : 'text-brand-fg-muted'}`}>
                      {req}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Custom Domains */}
      <section id="custom-domains" aria-labelledby="domains-heading">
        <h2 id="domains-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Custom domains
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Every deployment gets a <code className="font-mono-brand text-xs text-brand-fg-strong">{'<subdomain>.<BASE_DOMAIN>'}</code> URL automatically. You can also attach your own domain.
        </p>
        <ol className="mt-6 space-y-4">
          {[
            {
              step: '01',
              title: 'Add the domain',
              body: 'POST /deploy/:projectId/domains with { "domain": "app.yoursite.com" }. Mercy creates a CustomDomain record and returns the expected CNAME target.',
            },
            {
              step: '02',
              title: 'Point your DNS',
              body: 'Create a CNAME record from app.yoursite.com → your BASE_DOMAIN. DNS propagation usually takes under 5 minutes.',
            },
            {
              step: '03',
              title: 'TLS provisioned automatically',
              body: 'Caddy\'s on-demand TLS calls GET /internal/domain-check?domain=app.yoursite.com. Once the domain is verified in Postgres, Caddy issues a Let\'s Encrypt certificate on the first request.',
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

      {/* Build Logs */}
      <section id="build-logs" aria-labelledby="logs-heading">
        <h2 id="logs-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Build logs
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          The dashboard opens a WebSocket connection to the WS service (port 3002) and displays logs in real time. The connection is authenticated with the same JWT used for REST requests.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'Live streaming — every Docker stdout/stderr line appears in the browser as it happens.',
            'Persistent replay — if you open the log panel after a build started, historical lines are loaded from Postgres then the live stream resumes seamlessly.',
            'Multi-client — multiple browser tabs watching the same project all receive the same stream via Redis pub/sub.',
            'stderr highlighting — lines from stderr are visually differentiated for quick error spotting.',
            'Status updates — project status transitions (QUEUED → CLONING → BUILDING → DEPLOYED or FAILED) are pushed over the same connection.',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-brand-accent mt-0.5 shrink-0">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-brand-fg-muted">
          Set <code className="font-mono-brand text-brand-fg-subtle">NEXT_PUBLIC_WS_URL</code> in <code className="font-mono-brand text-brand-fg-subtle">apps/web/.env.local</code> to point the frontend at your WS service.
        </p>
      </section>

    </article>
  )
}
