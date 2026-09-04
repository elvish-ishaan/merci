import Link from 'next/link'
import { CodeBlock } from '@/app/docs/_components/code-block'
import { MermaidDiagram } from '../_components/mermaid-diagram'

const systemOverview = `
graph TB
  subgraph GitHub
    GH[git push / pull_request]
  end
  subgraph API["apps/api"]
    WH[POST /webhooks/github]
    YML[parseWorkflow]
    DB[(Postgres: Run/Job/Step)]
    INT[/internal callbacks/]
  end
  subgraph Queue
    Q[(merci-actions)]
  end
  subgraph Worker["apps/action-worker"]
    W[BullMQ Worker]
    P[processJob]
  end
  subgraph Docker
    C[node:20 container]
  end
  GH -->|webhook| WH
  WH --> YML
  YML --> DB
  YML -->|actionQueue.add| Q
  Q -->|dequeue| W
  W --> P
  P -->|git clone + docker run| C
  P -->|exec steps| C
  C -.->|stdout/stderr| P
  P -.->|postLog / patch| INT
  INT --> DB
`

const jobSequence = `
sequenceDiagram
  participant GH as GitHub
  participant API as apps/api
  participant Redis as merci-actions queue
  participant Worker as action-worker
  participant Docker as node:20 container

  GH->>API: webhook (push / PR)
  API->>API: parseWorkflow + matchesTrigger
  API->>API: create Run / Job / Steps
  API->>Redis: actionQueue.add(payload)

  Redis-->>Worker: dequeue job

  Worker->>API: PATCH run + job = RUNNING
  Worker->>Worker: decrypt github token + secrets

  rect rgba(120,120,120,0.08)
    note over Worker,Docker: Setup phase (step number -1)
    Worker->>Worker: git clone --no-tags + checkout sha
    Worker->>Docker: docker pull node:20
    Worker->>Docker: docker run -d (mounts + env)
    Worker->>Docker: git config safe.directory "*"
  end

  loop each workflow step
    Worker->>Worker: eval if: condition
    alt run: step
      Worker->>Docker: docker exec bash -e -c "cmd"
    else uses: step
      Worker->>Docker: docker cp action + node index.js
    end
    Docker-->>Worker: stdout / stderr + exit code
    Worker->>API: postLog + PATCH step status
    Worker->>Worker: read GITHUB_ENV exports
  end

  Worker->>Docker: docker rm -f container
  Worker->>API: PATCH job + run = SUCCEEDED / FAILED
`

const setupFlow = `
flowchart TD
  A[processJob payload] --> B[ensureDir tmp workspace + github files]
  B --> C[decrypt github token + secrets]
  C --> D[PATCH run/job = RUNNING]
  D --> E[git clone --no-tags]
  E --> F[git checkout sha]
  F --> G[docker pull node:20]
  G --> H[buildBaseEnv + merge env + secrets]
  H --> I[docker run -d tail -f /dev/null]
  I --> J[git config safe.directory *]
  J --> K{setup ok?}
  K -->|yes| L[step loop]
  K -->|no| M[PATCH setup step FAILED]
  M --> N[cleanup + return]
`

const stepDecision = `
stateDiagram-v2
  [*] --> Evaluate: next step
  Evaluate --> Skipped: if false OR prev failed
  Evaluate --> Running: should run

  Running --> Uses: step.uses
  Running --> Run: step.run
  Running --> NoOp: neither run nor uses

  Uses --> Collect: exit code
  Run --> Collect: exit code
  NoOp --> Collect

  Collect --> Succeeded: exit 0
  Collect --> Failed: exit != 0
  Failed --> ContinueOnError: continue-on-error true
  ContinueOnError --> [*]: keep going
  Failed --> MarkJobFailed: default
  Succeeded --> [*]
  Skipped --> [*]
`

const usesFlow = `
flowchart TD
  A[uses: owner/repo@ref] --> B{prefix?}
  B -->|docker://| X[unsupported, exit 1]
  B -->|./local| Y[read action.yml from container]
  B -->|owner/repo@ref| C{cached in RUNNER_TEMP?}
  C -->|yes + action.yml valid| E[use cache]
  C -->|no or partial| D[git clone --depth 1 --branch ref]
  D --> E
  E --> F[parse action.yml]
  F --> G[docker cp action into container]
  G --> H{runs.using}
  H -->|node20 / node16| I[docker exec node main.js + INPUT_* env]
  H -->|docker / composite| J[unsupported, exit 1]
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

export function MerciActionPost() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      {/* Breadcrumb */}
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <Link href="/blog" className="hover:text-brand-accent transition-colors">
          ~/blog
        </Link>
        <span className="mx-2 text-brand-border">/</span>
        <span className="text-brand-fg-subtle">merci-action</span>
      </p>

      {/* Header */}
      <header className="mt-4 mb-12">
        <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
          Inside merci-action: How Mercy Runs Your CI Workflows
        </h1>
        <div className="flex flex-wrap gap-4 items-center mt-5">
          <time
            dateTime="2026-07-03"
            className="font-mono-brand text-sm text-brand-fg-muted"
          >
            July 3, 2026
          </time>
          <span className="text-brand-border">·</span>
          <span className="font-mono-brand text-sm text-brand-fg-muted">20 min read</span>
          <span className="text-brand-border">·</span>
          <span className="font-mono-brand text-sm text-brand-fg-muted">Mercy Engineering</span>
        </div>
        <ul className="flex flex-wrap gap-2 mt-4">
          {['ci', 'docker', 'github-actions', 'bullmq', 'architecture'].map((tag) => (
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
        When you push a commit to a repository connected to Mercy, a workflow defined in{' '}
        <InlineCode>.github/workflows/*.yml</InlineCode> springs to life: your code is cloned,
        a container spins up, and each step runs in order with its logs streaming to the dashboard
        in real time. The service that does all of that heavy lifting is{' '}
        <InlineCode>action-worker</InlineCode> — Mercy's CI execution engine, internally called{' '}
        <em className="text-brand-fg-strong">merci-action</em>.
      </P>
      <P>
        It is a Bun-based BullMQ worker that consumes jobs from the{' '}
        <InlineCode>merci-actions</InlineCode> queue, clones the repository at the exact commit
        SHA, pulls and boots a Docker container, then executes every workflow step inside it —
        supporting both <InlineCode>run:</InlineCode> shell commands and{' '}
        <InlineCode>uses:</InlineCode> Node.js actions like{' '}
        <InlineCode>actions/checkout@v4</InlineCode>. This post is a deep walk-through of exactly
        what happens between a <InlineCode>git push</InlineCode> and a green (or red) check mark.
      </P>
      <Callout>
        Prerequisites: familiarity with GitHub Actions concepts (workflows, jobs, steps),
        Docker basics (<InlineCode>run</InlineCode>, <InlineCode>exec</InlineCode>,{' '}
        <InlineCode>cp</InlineCode>), and a high-level understanding of Redis job queues. This is
        a companion to{' '}
        <Link href="/blog/mercio-runtime" className="text-brand-accent hover:underline">
          Inside mercio-runtime
        </Link>{' '}
        — the two services share the same BullMQ + internal-callback design language.
      </Callout>

      {/* System Architecture */}
      <Heading2 id="architecture">System Architecture</Heading2>
      <P>
        The CI pipeline spans three moving parts: the API that receives GitHub webhooks, the
        Redis queue that decouples ingestion from execution, and the worker that actually runs
        the container. Understanding where <InlineCode>action-worker</InlineCode> sits is the
        right starting point.
      </P>
      <MermaidDiagram
        chart={systemOverview}
        caption="Figure 1 — Full CI pipeline. The API parses the workflow and enqueues a job; the worker executes it in Docker and streams results back through internal callbacks."
      />
      <P>The three services and their responsibilities:</P>
      <UL>
        <LI>
          <strong className="text-brand-fg-strong">apps/api</strong> — Receives the GitHub
          webhook, fetches the workflow YAML at the pushed commit, parses it, matches the trigger
          (<InlineCode>push</InlineCode> / <InlineCode>pull_request</InlineCode> against the
          branch), creates the <InlineCode>ActionRun</InlineCode> /{' '}
          <InlineCode>ActionJob</InlineCode> / <InlineCode>ActionStep</InlineCode> rows, and adds
          a job to the queue via <InlineCode>actionQueue.add()</InlineCode>.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Redis / BullMQ</strong> — The{' '}
          <InlineCode>merci-actions</InlineCode> queue is the hand-off point. It decouples the
          webhook handler (which must respond to GitHub fast) from execution (which can take
          minutes), and gives us back-pressure and retry semantics for free.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">apps/action-worker</strong> — This service.
          Consumes invocation jobs, clones the repo, manages the Docker container lifecycle,
          runs each step, and reports logs and status back to the API's{' '}
          <InlineCode>/internal</InlineCode> endpoints.
        </LI>
      </UL>
      <Callout>
        A key design decision: the worker never talks to the database to <em>write</em> status.
        It reads the ordered step IDs directly (via <InlineCode>@repo/db</InlineCode>) but funnels
        every log line and status change through authenticated HTTP callbacks to the API. This
        keeps the API as the single writer and the single source of truth for what the dashboard
        renders.
      </Callout>

      {/* Job Lifecycle */}
      <Heading2 id="job-lifecycle">The Job Lifecycle</Heading2>
      <P>
        Let us trace a single workflow run end-to-end, from the webhook to the final status
        patch.
      </P>
      <MermaidDiagram
        chart={jobSequence}
        caption="Figure 2 — Sequence diagram of a complete CI job: webhook ingestion, setup phase, the step loop, and cleanup."
      />

      <Heading3>Step 1 — API ingests the webhook and enqueues</Heading3>
      <P>
        When GitHub delivers a <InlineCode>push</InlineCode> or{' '}
        <InlineCode>pull_request</InlineCode> event, the API fetches every{' '}
        <InlineCode>.github/workflows/*.yml</InlineCode> file at that commit, parses each one, and
        checks whether its triggers match the event. For every matching workflow it creates an{' '}
        <InlineCode>ActionRun</InlineCode>, and for each job inside it an{' '}
        <InlineCode>ActionJob</InlineCode> plus its <InlineCode>ActionStep</InlineCode> rows —
        including an implicit setup step at <InlineCode>number: -1</InlineCode> named{' '}
        &quot;Set up job&quot;. It then enqueues the full payload:
      </P>
      <CodeBlock language="typescript">
        {`interface ActionJobPayload {
  runId: string
  jobId: string
  repoFullName: string          // "owner/repo"
  sha: string                   // exact commit to check out
  ref: string                   // e.g. "refs/heads/main"
  event: string                 // "push" | "pull_request"
  runsOn: string                // "ubuntu-latest" etc.
  steps: WorkflowStep[]         // parsed run: / uses: steps
  env: Record<string, string>   // workflow + job level env
  secrets: Array<{ name: string; encryptedValue: string }>
  encryptedGithubToken: string | null
  actor: string                 // pusher login
}`}
      </CodeBlock>
      <P>
        Note that secrets and the GitHub token travel through the queue{' '}
        <em className="text-brand-fg-strong">encrypted</em>. They are only decrypted inside the
        worker, in memory, at the moment they are needed.
      </P>

      <Heading3>Step 2 — Worker dequeues and marks RUNNING</Heading3>
      <P>
        The BullMQ worker pulls the job (up to <InlineCode>WORKER_CONCURRENCY</InlineCode> at
        once, default 2) and immediately patches the run and job to{' '}
        <InlineCode>RUNNING</InlineCode> with a start timestamp. It then decrypts the GitHub token
        and each secret using <InlineCode>@repo/crypto</InlineCode>'s{' '}
        <InlineCode>decryptValue</InlineCode>. Decryption failures are logged and skipped rather
        than aborting the whole job — a single malformed secret should not take down the run.
      </P>

      <Heading3>Step 3 — Setup phase</Heading3>
      <P>
        All pre-step work is attributed to the setup step (<InlineCode>number: -1</InlineCode>)
        so its output shows up under &quot;Set up job&quot; in the UI, exactly like GitHub. This
        phase clones the repo, pulls the image, boots the container, and configures git. We
        cover it in detail in the next section.
      </P>

      <Heading3>Step 4 — The step loop</Heading3>
      <P>
        The worker iterates over the parsed steps, pairing each with its pre-created DB step row
        by index. For each step it evaluates the <InlineCode>if:</InlineCode> condition,
        interpolates <InlineCode>{'${{ }}'}</InlineCode> expressions, runs either a shell command
        or a Node action inside the container, reads back any exported env vars, and patches the
        step's final status.
      </P>

      <Heading3>Step 5 — Cleanup and final status</Heading3>
      <P>
        In a <InlineCode>finally</InlineCode> block, the container is force-removed and the temp
        directory deleted — this runs even if a step throws unexpectedly. Finally the job and run
        are patched to <InlineCode>SUCCEEDED</InlineCode> or <InlineCode>FAILED</InlineCode> based
        on the accumulated conclusion.
      </P>

      {/* Setup Phase */}
      <Heading2 id="setup-phase">The Setup Phase</Heading2>
      <P>
        Before any user step can run, the worker has to prepare an isolated workspace and a live
        container. Every command here streams into the &quot;Set up job&quot; step, so a clone
        or pull failure is visible on the run page and in the worker's terminal.
      </P>
      <MermaidDiagram
        chart={setupFlow}
        caption="Figure 3 — Setup phase. A failure anywhere short-circuits to cleanup with the setup step marked FAILED."
      />

      <Heading3>Temp directory layout</Heading3>
      <P>
        Each job gets a unique temp tree under the OS temp dir, keyed by job ID. Two directories
        are bind-mounted into the container:
      </P>
      <CodeBlock language="text">
        {`/tmp/merci-action-<jobId>/
  workspace/          → mounted at /github/workspace  (the checked-out repo)
  github/             → mounted at /github            (runner scratch files)
    env               → GITHUB_ENV   (exports to later steps)
    path              → GITHUB_PATH
    output            → GITHUB_OUTPUT
    step_summary      → GITHUB_STEP_SUMMARY
    runner_temp/      → RUNNER_TEMP`}
      </CodeBlock>
      <P>
        These files are pre-created empty so that steps (and actions) can append to them without
        first checking for existence — mirroring the real GitHub runner's filesystem contract.
      </P>

      <Heading3>Cloning at the exact SHA</Heading3>
      <P>
        The worker clones with <InlineCode>git clone --no-tags</InlineCode> then{' '}
        <InlineCode>git checkout &lt;sha&gt;</InlineCode>, guaranteeing the build runs against the
        precise commit that triggered it — not just the current tip of the branch, which may have
        moved. When a GitHub token is present it is injected into the clone URL as{' '}
        <InlineCode>x-access-token</InlineCode>, enabling private-repo checkouts:
      </P>
      <CodeBlock language="typescript">
        {`const authUrl = githubToken
  ? \`https://x-access-token:\${githubToken}@github.com/\${repoFullName}.git\`
  : \`https://github.com/\${repoFullName}.git\`

// git clone --no-tags <authUrl> <workspaceDir>
// git -C <workspaceDir> checkout <sha>`}
      </CodeBlock>

      <Heading3>Booting the container</Heading3>
      <P>
        The <InlineCode>runs-on</InlineCode> label is mapped to a Docker image by{' '}
        <InlineCode>resolveImage()</InlineCode> — today everything (<InlineCode>ubuntu-latest</InlineCode>,{' '}
        <InlineCode>linux</InlineCode>, <InlineCode>node</InlineCode>) resolves to{' '}
        <InlineCode>node:20</InlineCode>. After <InlineCode>docker pull</InlineCode>, the container
        is started detached with <InlineCode>tail -f /dev/null</InlineCode> as its command — a
        classic trick that keeps the container alive and idle so we can{' '}
        <InlineCode>docker exec</InlineCode> each step into it:
      </P>
      <CodeBlock filename="docker.ts" language="typescript">
        {`docker run -d \\
  --name merci-action-<jobId> \\
  -v <workspaceDir>:/github/workspace \\
  -v <githubFilesDir>:/github \\
  -w /github/workspace \\
  --env KEY=VALUE ...   \\   // baseEnv + workflow env + secrets
  node:20 \\
  tail -f /dev/null`}
      </CodeBlock>

      <Heading3>The safe.directory fix</Heading3>
      <P>
        The workspace is owned by the host user (whatever UID the worker runs as), but the
        container runs as root. Git 2.35+ refuses to operate on a repository owned by a different
        user — which would break <InlineCode>actions/checkout</InlineCode> and any{' '}
        <InlineCode>run:</InlineCode> step that touches git. The fix is to run, once at setup:
      </P>
      <CodeBlock language="bash">
        {`git config --global --add safe.directory "*"`}
      </CodeBlock>
      <Callout>
        If setup fails at any point — clone, checkout, pull, or run — the worker marks the setup
        step <InlineCode>FAILED</InlineCode>, patches the job and run to{' '}
        <InlineCode>FAILED</InlineCode>, removes the container, deletes the temp dir, and returns
        early. No user steps execute against a broken workspace.
      </Callout>

      {/* Step Execution */}
      <Heading2 id="step-execution">Step Execution</Heading2>
      <P>
        With a live container, the worker walks the step list. Each step passes through the same
        decision pipeline: should it run, what kind of step is it, and what was the outcome.
      </P>
      <MermaidDiagram
        chart={stepDecision}
        caption="Figure 4 — Per-step state machine. A failed step (without continue-on-error) causes all subsequent steps to be skipped, but the run still completes and cleans up."
      />

      <Heading3>Conditions and skipping</Heading3>
      <P>
        Before running, the step's <InlineCode>if:</InlineCode> condition is interpolated and
        evaluated by <InlineCode>evalCondition</InlineCode>, which understands{' '}
        <InlineCode>success()</InlineCode>, <InlineCode>failure()</InlineCode>,{' '}
        <InlineCode>always()</InlineCode>, <InlineCode>!cancelled()</InlineCode>, and literal{' '}
        <InlineCode>true</InlineCode>/<InlineCode>false</InlineCode>. If there is no explicit
        condition and a previous step already failed, the step is skipped automatically — matching
        GitHub's default fail-fast behaviour. Skipped steps are patched with status{' '}
        <InlineCode>SKIPPED</InlineCode> and both timestamps set.
      </P>
      <Callout>
        Unknown or complex conditions fall through to <InlineCode>true</InlineCode> rather than
        being treated as false. The reasoning: silently skipping a step the author intended to
        run is far more confusing than running one extra step. It is a deliberate
        fail-<em>open</em> choice for an expression evaluator that does not yet cover the full
        GitHub grammar.
      </Callout>

      <Heading3>run: steps</Heading3>
      <P>
        A <InlineCode>run:</InlineCode> step's command is interpolated (resolving{' '}
        <InlineCode>{'${{ github.* }}'}</InlineCode>, <InlineCode>{'${{ secrets.* }}'}</InlineCode>,{' '}
        <InlineCode>{'${{ env.* }}'}</InlineCode>) and executed inside the container. The shell
        defaults to <InlineCode>bash</InlineCode> but can be overridden per step. Crucially it
        runs with the <InlineCode>-e</InlineCode> flag so a failing command aborts the script and
        surfaces a non-zero exit code:
      </P>
      <CodeBlock filename="docker.ts" language="typescript">
        {`docker exec \\
  --env KEY=VALUE ...  \\        // step-level env overrides
  --workdir <working-directory> \\  // optional
  merci-action-<jobId> \\
  bash -e -c "<interpolated command>"`}
      </CodeBlock>
      <P>
        Both stdout and stderr are consumed line-by-line as they arrive (see{' '}
        <a href="#logging" className="text-brand-accent hover:underline">Log streaming</a>{' '}
        below) and the process exit code becomes the step's pass/fail signal.
      </P>

      <Heading3>uses: steps</Heading3>
      <P>
        <InlineCode>uses:</InlineCode> steps reference reusable actions like{' '}
        <InlineCode>actions/checkout@v4</InlineCode>. Resolving and running one is the most
        involved path in the worker:
      </P>
      <MermaidDiagram
        chart={usesFlow}
        caption="Figure 5 — Resolution of a uses: action, from reference parsing to node execution inside the container."
      />
      <UL>
        <LI>
          <strong className="text-brand-fg-strong">Reference parsing</strong> —{' '}
          <InlineCode>owner/repo@ref</InlineCode> is split with a regex.{' '}
          <InlineCode>docker://</InlineCode> and composite/docker-type actions are explicitly not
          yet supported and return a clean error.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Action cache</strong> — the action repo is
          cloned once (<InlineCode>--depth 1 --branch ref</InlineCode>) into a process-wide cache
          under <InlineCode>RUNNER_TEMP/merci-action-cache/</InlineCode> and reused across jobs.
          If a cached directory exists but is missing <InlineCode>action.yml</InlineCode> (a
          partial clone), it is removed and re-cloned.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Copy into container</strong> — the cached
          action is copied to <InlineCode>/github/actions/&lt;owner&gt;/&lt;repo&gt;</InlineCode>{' '}
          via <InlineCode>docker cp</InlineCode>.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Inputs</strong> — the{' '}
          <InlineCode>with:</InlineCode> block becomes <InlineCode>INPUT_*</InlineCode> env vars
          (uppercased, spaces to underscores). Defaults declared in{' '}
          <InlineCode>action.yml</InlineCode> fill in anything not explicitly provided, with{' '}
          <InlineCode>{'${{ github.* }}'}</InlineCode> defaults resolved against the container's{' '}
          <InlineCode>GITHUB_*</InlineCode> env.
        </LI>
        <LI>
          <strong className="text-brand-fg-strong">Execution</strong> — for{' '}
          <InlineCode>node20</InlineCode>/<InlineCode>node16</InlineCode> actions, the worker runs{' '}
          <InlineCode>node &lt;actionPath&gt;/&lt;runs.main&gt;</InlineCode> inside the container.
        </LI>
      </UL>

      <Heading3>Passing env between steps</Heading3>
      <P>
        After every step, the worker reads the mounted <InlineCode>GITHUB_ENV</InlineCode> file
        and merges any <InlineCode>KEY=VALUE</InlineCode> exports into a{' '}
        <InlineCode>stepEnv</InlineCode> map that is layered into subsequent steps. This is how a
        step that writes <InlineCode>echo &quot;VERSION=1.2.3&quot; &gt;&gt; $GITHUB_ENV</InlineCode>{' '}
        makes <InlineCode>$VERSION</InlineCode> available to the next step — exactly as on GitHub.
      </P>
      <Callout>
        The current reader handles the simple <InlineCode>KEY=VALUE</InlineCode> form. GitHub's
        heredoc-style multiline syntax (<InlineCode>NAME&lt;&lt;EOF</InlineCode>) is a known
        limitation noted in the source — a good first contribution if you want to dig in.
      </Callout>

      {/* Log streaming */}
      <Heading2 id="logging">Log Streaming</Heading2>
      <P>
        Every child process — <InlineCode>git</InlineCode>, <InlineCode>docker</InlineCode>, and
        the step commands — is spawned via <InlineCode>Bun.spawn</InlineCode> with piped stdout
        and stderr. A shared <InlineCode>consumeStream</InlineCode> helper reads each pipe,
        decodes UTF-8 incrementally, and splits on newlines so partial chunks never corrupt a log
        line:
      </P>
      <CodeBlock filename="stream.ts" language="typescript">
        {`buf += decoder.decode(value, { stream: true })
const lines = buf.split('\\n')
buf = lines.pop() ?? ''          // keep the incomplete tail
for (const line of lines) {
  if (line) onLog(line, stream)  // 'stdout' | 'stderr'
}`}
      </CodeBlock>
      <P>
        Each line is dispatched through an <InlineCode>onLog</InlineCode> callback that does two
        things: writes to the worker's own pino logger (<InlineCode>stdout → debug</InlineCode>,{' '}
        <InlineCode>stderr → warn</InlineCode> so errors are always visible in the terminal) and
        POSTs the line to the API at <InlineCode>/internal/action-logs</InlineCode> tagged with
        the current step ID. Those rows are what the dashboard renders as a live, per-step log
        view.
      </P>
      <P>
        Status changes ride the same authenticated internal API. All calls carry a{' '}
        <InlineCode>Bearer {'{'}WORKER_SECRET{'}'}</InlineCode> header; a non-OK response is
        logged as a warning rather than swallowed, so a secret mismatch is visible immediately
        instead of silently dropping every log line and status update.
      </P>
      <UL>
        <LI><InlineCode>POST /internal/action-logs</InlineCode> — one log line.</LI>
        <LI><InlineCode>PATCH /internal/action-steps/:id</InlineCode> — step status/conclusion/timestamps.</LI>
        <LI><InlineCode>PATCH /internal/action-jobs/:id</InlineCode> — job status.</LI>
        <LI><InlineCode>PATCH /internal/action-runs/:id</InlineCode> — overall run status.</LI>
      </UL>

      {/* Container env */}
      <Heading2 id="container-env">The Container Environment</Heading2>
      <P>
        <InlineCode>buildBaseEnv</InlineCode> constructs the same environment a real GitHub runner
        exposes, so most actions and scripts work unchanged. It is layered with workflow/job env
        and decrypted secrets before being passed to the container:
      </P>
      <CodeBlock language="typescript">
        {`const baseEnv = buildBaseEnv({ repoFullName, sha, ref, event, actor, githubToken })
const jobEnv  = { ...baseEnv, ...env, ...decryptedSecrets }`}
      </CodeBlock>
      <EnvTable
        rows={[
          { name: 'CI', default: 'true', description: 'Signals a CI environment to tools.' },
          { name: 'GITHUB_ACTIONS', default: 'true', description: 'Marks the runner as GitHub-Actions-compatible.' },
          { name: 'GITHUB_WORKSPACE', default: '/github/workspace', description: 'The checked-out repo, bind-mounted from the host.' },
          { name: 'GITHUB_ENV', default: '/github/env', description: 'File steps append to, to export env to later steps.' },
          { name: 'GITHUB_OUTPUT', default: '/github/output', description: 'File for step outputs.' },
          { name: 'GITHUB_STEP_SUMMARY', default: '/github/step_summary', description: 'Markdown job summary file.' },
          { name: 'GITHUB_REPOSITORY', default: 'owner/repo', description: 'Full repository name.' },
          { name: 'GITHUB_SHA', default: '—', description: 'The commit SHA being built.' },
          { name: 'GITHUB_REF', default: '—', description: 'Full ref, e.g. refs/heads/main.' },
          { name: 'GITHUB_REF_NAME', default: '—', description: 'Branch or tag name derived from the ref.' },
          { name: 'GITHUB_EVENT_NAME', default: '—', description: 'push or pull_request.' },
          { name: 'GITHUB_ACTOR', default: '—', description: 'The login that triggered the run.' },
          { name: 'GITHUB_TOKEN', default: '—', description: 'Decrypted access token (only if present).' },
          { name: 'RUNNER_OS', default: 'Linux', description: 'Reported runner OS.' },
          { name: 'RUNNER_ARCH', default: 'X64', description: 'Reported runner architecture.' },
          { name: 'RUNNER_TEMP', default: '/github/runner_temp', description: 'Scratch space for actions.' },
        ]}
      />

      {/* Concurrency & config */}
      <Heading2 id="concurrency">Concurrency and Configuration</Heading2>
      <P>
        A single worker instance processes up to <InlineCode>WORKER_CONCURRENCY</InlineCode> jobs
        at once (default 2), each in its own uniquely-named container and temp directory, so there
        is no cross-contamination between concurrent runs. Horizontal scaling is trivial: deploy
        more worker containers pointed at the same Redis, and BullMQ distributes jobs across them
        with zero coordination.
      </P>
      <EnvTable
        rows={[
          { name: 'MERCI_ACTIONS_INTERNAL_URL', default: 'http://localhost:3001', description: 'Base URL of apps/api for internal callbacks (logs, status).' },
          { name: 'WORKER_SECRET', default: '', description: 'Shared bearer secret — must match apps/api.' },
          { name: 'ENV_ENCRYPTION_KEY', default: '', description: '64-char hex key that decrypts the token + secrets — must match apps/api.' },
          { name: 'DATABASE_URL', default: '', description: 'Postgres connection string (reads ordered step IDs).' },
          { name: 'REDIS_HOST', default: 'localhost', description: 'Redis host for the merci-actions queue.' },
          { name: 'REDIS_PORT', default: '6379', description: 'Redis port.' },
          { name: 'WORKER_CONCURRENCY', default: '2', description: 'Max concurrent Docker containers per worker instance.' },
        ]}
      />
      <Callout>
        <InlineCode>WORKER_SECRET</InlineCode> and <InlineCode>ENV_ENCRYPTION_KEY</InlineCode>{' '}
        must be byte-for-byte identical in both <InlineCode>apps/action-worker</InlineCode> and{' '}
        <InlineCode>apps/api</InlineCode>. A secret mismatch makes every internal call return 401
        — logs and status updates silently stop; an encryption-key mismatch means the token and
        secrets decrypt to garbage. Both are the first things to check when a run &quot;hangs&quot;
        in the UI.
      </Callout>

      {/* Cleanup & shutdown */}
      <Heading2 id="cleanup">Cleanup and Graceful Shutdown</Heading2>
      <P>
        Per-job cleanup lives in a <InlineCode>finally</InlineCode> block so it runs whether the
        step loop finished normally or threw: the container is force-removed with{' '}
        <InlineCode>docker rm -f</InlineCode> and the temp tree is deleted. Both are wrapped in{' '}
        <InlineCode>.catch(() =&gt; {'{}'})</InlineCode> — a cleanup failure should never mask the
        job's real result.
      </P>
      <P>
        At the process level, the entry point drains BullMQ on{' '}
        <InlineCode>SIGTERM</InlineCode>/<InlineCode>SIGINT</InlineCode> so Docker can stop the
        container cleanly without abandoning an in-flight run:
      </P>
      <CodeBlock filename="index.ts" language="typescript">
        {`async function shutdown() {
  logger.info('shutting down action worker')
  await worker.close()   // stop accepting jobs, finish in-flight work
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)`}
      </CodeBlock>

      {/* Conclusion */}
      <Heading2 id="conclusion">Conclusion</Heading2>
      <P>
        <InlineCode>action-worker</InlineCode> reimplements the core of GitHub Actions in a few
        hundred lines of focused TypeScript: parse a workflow, clone at a SHA, boot a container,
        run each step, and stream everything back. The design leans on a handful of deliberate
        choices — a job queue for durable, back-pressured hand-off; a long-lived{' '}
        <InlineCode>tail -f /dev/null</InlineCode> container that steps <InlineCode>exec</InlineCode>{' '}
        into; encrypted secrets that only decrypt inside the worker; and the API as the single
        writer behind authenticated internal callbacks.
      </P>
      <P>
        It is intentionally not a full GitHub-Actions clone — docker and composite actions,
        multiline <InlineCode>GITHUB_ENV</InlineCode> exports, and the complete expression grammar
        are all still on the roadmap. But for the common case (<InlineCode>run:</InlineCode>{' '}
        scripts plus popular Node actions like <InlineCode>checkout</InlineCode> and{' '}
        <InlineCode>setup-node</InlineCode>) it delivers real CI with live logs and honest
        pass/fail semantics.
      </P>
      <P>
        To see it in action, connect a repository in the Mercy dashboard, push a commit with a
        workflow file, and watch the logs stream in. Or explore the source under{' '}
        <InlineCode>apps/action-worker/</InlineCode> to see the setup, step loop, and cleanup up
        close.
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
