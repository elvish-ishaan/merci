import type { Metadata } from 'next'
import { CodeBlock } from '../_components/code-block'

export const metadata: Metadata = {
  title: 'Mercob — Scheduled Jobs — Mercy Docs',
  description:
    'Schedule any Mercio function to run on a cron, daily, weekly, interval, or one-shot schedule. Full retry control, timeout handling, and per-run log history.',
}

export default function MercobPage() {
  return (
    <article>

      {/* Header */}
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <span className="text-brand-accent">~/</span>docs / mercob
      </p>
      <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
        Mercob
      </h1>
      <p className="mt-4 text-base text-brand-fg-subtle max-w-2xl">
        The scheduled-job engine for the Mercy platform. Mercob polls the database for due jobs, dispatches them onto the same BullMQ queue used by Mercio, and tracks every execution attempt from dispatch to completion.
      </p>

      <hr className="border-brand-border my-10" />

      {/* Overview */}
      <section id="overview" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight mt-0">
          Overview
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Mercob sits on top of Mercio. It does not run function code itself — it schedules HTTP calls to a deployed Mercio function and records the results. Every scheduled job:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-brand-fg-subtle">
          {[
            'Targets a deployed Mercio function by its ID.',
            'Supports five schedule kinds: CRON, DAILY, WEEKLY, INTERVAL, and ONCE.',
            'Configures the exact HTTP request to send (method, path, query, headers, body).',
            'Retries on failure up to a configured limit, with per-attempt status tracking.',
            'Enforces a per-invocation timeout. Timed-out jobs are marked TIMEOUT, not lost.',
            'Records a full JobRun for every execution attempt, with logs streamed from mercio-runtime.',
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
              title: 'Poller tick (every 60 s)',
              body: 'The mercob service queries ScheduledJob rows where active = true and nextRunAt ≤ now + 60 s. The 60-second look-ahead window prevents jobs from being skipped due to clock skew. Due jobs are dispatched in parallel, up to 10 at a time.',
            },
            {
              step: '02',
              title: 'Dispatch',
              body: 'For each due job, mercob creates a JobRun row (status = QUEUED) and calls the dispatch loop. Dispatch pushes a BullMQ job onto the mercio-invocations queue with the configured HTTP request parameters and timeoutMs.',
            },
            {
              step: '03',
              title: 'Execution via mercio-runtime',
              body: 'mercio-runtime picks up the job, routes it to the warm workerd process for the target function ID, and makes the HTTP request. It enforces timeoutMs via AbortController. On completion (success or timeout), the BullMQ job result or failure is recorded.',
            },
            {
              step: '04',
              title: 'Result & retry',
              body: 'Dispatch reads the BullMQ result. On success, the JobRun is patched to SUCCEEDED with HTTP status, response body, and duration. On failure, dispatch retries up to maxRetries times. After all retries are exhausted, the run is marked FAILED or TIMEOUT.',
            },
            {
              step: '05',
              title: 'Advance schedule',
              body: 'After the run completes (regardless of outcome), nextRunAt is advanced for recurring jobs. One-shot jobs (ONCE) are deactivated after firing.',
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
          Before creating a scheduled job you need a deployed Mercio function. See the{' '}
          <a href="/docs/mercio#quickstart" className="text-brand-fg-strong underline underline-offset-4 decoration-brand-border hover:decoration-brand-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">
            Mercio quickstart
          </a>.
        </p>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">Create a scheduled job via the dashboard</h3>
        <ol className="space-y-3 text-sm text-brand-fg-subtle">
          {[
            'Navigate to /dashboard/mercob and click "New job".',
            'Select the target Mercio function from the dropdown.',
            'Give the job a name and configure the schedule (see Schedule kinds below).',
            'Set the HTTP method, path, and optional query/headers/body.',
            'Configure maxRetries (default 0) and timeoutMs (default 30 000 ms).',
            'Save. The job is active immediately and will fire on its next scheduled time.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono-brand text-brand-accent text-xs shrink-0 w-4">{String(i + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">Create a job via the API</h3>
        <CodeBlock language="bash">{`TOKEN="<your-jwt>"
FUNCTION_ID="<mercio-function-id>"

curl -X POST https://api.yourdomain.com/api/mercob/jobs \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "content-type: application/json" \\
  -d '{
    "functionId": "'$FUNCTION_ID'",
    "name": "daily-report",
    "scheduleKind": "DAILY",
    "timeOfDay": "09:00",
    "method": "GET",
    "path": "/",
    "maxRetries": 2,
    "timeoutMs": 15000
  }'`}</CodeBlock>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">Manually trigger a job</h3>
        <CodeBlock language="bash">{`JOB_ID="<job-id>"

curl -X POST https://api.yourdomain.com/api/mercob/jobs/$JOB_ID/trigger \\
  -H "Authorization: Bearer $TOKEN"`}</CodeBlock>
        <p className="mt-2 text-xs text-brand-fg-muted">
          Triggering manually creates a JobRun and dispatches it immediately, regardless of the schedule.
        </p>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Schedule kinds */}
      <section id="schedule-kinds" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Schedule kinds
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Set <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">scheduleKind</code> to one of the following values.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Kind</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Required fields</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['INTERVAL', 'intervalSec', 'Runs every N seconds after the previous run completes.'],
                ['DAILY', 'timeOfDay (HH:MM UTC)', 'Runs once per day at the specified UTC time.'],
                ['WEEKLY', 'timeOfDay, daysOfWeek (0=Sun)', 'Runs on specified days of the week at the given UTC time.'],
                ['CRON', 'cronExpr', 'Standard 5-field cron expression (parsed with cron-parser). Times are UTC.'],
                ['ONCE', 'runAt (ISO datetime)', 'Fires once at the given time, then deactivates itself.'],
              ].map(([kind, fields, desc]) => (
                <tr key={kind}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{kind}</code></td>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-fg-muted">{fields}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-3">Examples</h3>
        <CodeBlock language="json">{`// Every 5 minutes
{ "scheduleKind": "INTERVAL", "intervalSec": 300 }

// Every day at 8:30 AM UTC
{ "scheduleKind": "DAILY", "timeOfDay": "08:30" }

// Every Monday and Wednesday at noon UTC
{ "scheduleKind": "WEEKLY", "timeOfDay": "12:00", "daysOfWeek": [1, 3] }

// Standard cron — every hour on weekdays
{ "scheduleKind": "CRON", "cronExpr": "0 * * * 1-5" }

// One-shot at a specific time
{ "scheduleKind": "ONCE", "runAt": "2026-06-01T09:00:00.000Z" }`}</CodeBlock>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Retries & timeouts */}
      <section id="retries" aria-labelledby="retries-heading">
        <h2 id="retries-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Retries &amp; timeouts
        </h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Field</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Default</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['maxRetries', '0', 'Number of retry attempts after the first failure. 0 = no retries, run fails immediately.'],
                ['timeoutMs', '30000', 'Per-attempt timeout in milliseconds. Enforced by AbortController inside mercio-runtime.'],
              ].map(([field, def, desc]) => (
                <tr key={field}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{field}</code></td>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-fg-muted">{def}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-brand-fg-subtle">
          Mercob waits for <code className="font-mono-brand text-xs text-brand-fg-strong">timeoutMs + 30 000 ms</code> before giving up on a BullMQ job. The extra 30-second buffer ensures that mercio-runtime has time to cleanly fail the job before the dispatcher times out — preventing duplicate runs.
        </p>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Run history */}
      <section id="run-history" aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Run history
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Every dispatch creates a <strong className="font-semibold text-brand-fg">JobRun</strong> record. You can view run history in the dashboard at <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">/dashboard/mercob/[id]</code> or via the API.
        </p>

        <h3 className="font-mono-brand text-sm text-brand-fg-muted mt-6 mb-3">Run statuses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Status</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['QUEUED', 'JobRun created; BullMQ job not yet picked up.'],
                ['RUNNING', 'mercio-runtime is executing the function.'],
                ['SUCCEEDED', 'Function returned a response within timeoutMs.'],
                ['FAILED', 'All retry attempts exhausted with non-successful outcomes.'],
                ['TIMEOUT', 'Function did not respond within timeoutMs on the final attempt.'],
              ].map(([status, meaning]) => (
                <tr key={status}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{status}</code></td>
                  <td className="py-3 text-xs text-brand-fg-subtle">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-mono-brand text-base text-brand-fg-strong mt-8 mb-2">Fetch run history via the API</h3>
        <CodeBlock language="bash">{`JOB_ID="<job-id>"

# paginated run list
curl -s -H "Authorization: Bearer $TOKEN" \\
  "https://api.yourdomain.com/api/mercob/jobs/$JOB_ID/runs?page=1&limit=20"

# single run with logs
RUN_ID="<run-id>"
curl -s -H "Authorization: Bearer $TOKEN" \\
  "https://api.yourdomain.com/api/mercob/runs/$RUN_ID"`}</CodeBlock>
      </section>

      <hr className="border-brand-border my-10" />

      {/* Configuration */}
      <section id="configuration" aria-labelledby="config-heading">
        <h2 id="config-heading" className="font-mono-brand text-2xl text-brand-fg-strong tracking-tight">
          Configuration
        </h2>
        <p className="mt-3 text-sm text-brand-fg-subtle">
          Set these in <code className="font-mono-brand text-xs text-brand-accent bg-brand-surface border border-brand-border rounded px-1.5 py-0.5">apps/mercob/.env</code>.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Variable</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3 pr-6">Required</th>
                <th className="font-mono-brand text-xs text-brand-fg-muted text-left pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {[
                ['DATABASE_URL', 'yes', 'PostgreSQL connection string'],
                ['REDIS_HOST', 'yes', 'Redis host'],
                ['REDIS_PORT', 'no', 'Redis port (default 6379)'],
                ['WORKER_SECRET', 'yes', 'Shared secret for internal API calls (PATCH /internal/job-runs, POST /internal/job-logs)'],
                ['API_BASE_URL', 'no', 'Base URL of the API service (default http://localhost:3001)'],
              ].map(([name, req, desc]) => (
                <tr key={name}>
                  <td className="py-3 pr-6"><code className="font-mono-brand text-xs text-brand-accent">{name}</code></td>
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

    </article>
  )
}
