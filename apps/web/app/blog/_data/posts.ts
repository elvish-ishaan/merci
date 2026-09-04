export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  tags: string[]
  author: string
  readingTimeMin: number
}

export const posts: BlogPost[] = [
  {
    slug: 'merci-action',
    title: 'Inside merci-action: How Mercy Runs Your CI Workflows',
    description:
      'A deep technical dive into action-worker — the Bun-based CI engine that consumes the merci-actions BullMQ queue, clones your repo at a commit SHA, boots a Docker container, and runs every workflow step (run: and uses:) with logs streamed live to the dashboard.',
    publishedAt: '2026-07-03',
    tags: ['ci', 'docker', 'github-actions', 'bullmq', 'architecture'],
    author: 'Mercy Engineering',
    readingTimeMin: 20,
  },
  {
    slug: 'mercio-runtime',
    title: 'Inside mercio-runtime: How Mercy Executes Serverless Functions',
    description:
      'A deep technical dive into mercio-runtime — the Bun-based execution engine that manages warm workerd V8 pools, BullMQ job routing, and R2-cached bundles to run serverless functions on Mercy with sub-millisecond warm latency.',
    publishedAt: '2026-06-01',
    tags: ['serverless', 'workerd', 'v8', 'bullmq', 'architecture'],
    author: 'Mercy Engineering',
    readingTimeMin: 18,
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}
