import type { Metadata } from 'next'
import Link from 'next/link'
import { posts } from './_data/posts'

export const metadata: Metadata = {
  title: 'Blog — Mercy',
  description:
    'Deep technical articles from the Mercy engineering team on serverless architecture, V8 isolation, job queues, and how Mercy is built.',
  alternates: { canonical: 'https://mercy.sh/blog' },
  openGraph: {
    title: 'Blog — Mercy',
    description: 'Deep technical articles from the Mercy engineering team.',
    type: 'website',
    url: 'https://mercy.sh/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Mercy',
    description: 'Deep technical articles from the Mercy engineering team.',
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="font-mono-brand text-sm text-brand-fg-muted">
        <span className="text-brand-accent">~/</span>blog
      </p>
      <h1 className="font-mono-brand text-3xl md:text-4xl text-brand-fg-strong tracking-tight leading-tight mt-3">
        Engineering Blog
      </h1>
      <p className="mt-4 text-base text-brand-fg-subtle max-w-2xl">
        Deep dives into how Mercy works under the hood — serverless runtimes, isolation primitives, job queues, and more.
      </p>

      <div className="mt-12 flex flex-col gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block bg-brand-surface border border-brand-border rounded-lg p-6 transition-colors hover:border-brand-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <time
                dateTime={post.publishedAt}
                className="font-mono-brand text-xs text-brand-fg-muted"
              >
                {formatDate(post.publishedAt)}
              </time>
              <span className="text-brand-border">·</span>
              <span className="font-mono-brand text-xs text-brand-fg-muted">
                {post.readingTimeMin} min read
              </span>
            </div>

            <h2 className="font-mono-brand text-lg text-brand-fg-strong group-hover:text-brand-accent transition-colors leading-snug mb-2">
              {post.title}
            </h2>

            <p className="text-sm text-brand-fg-subtle mb-4 leading-relaxed">
              {post.description}
            </p>

            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="font-mono-brand text-xs text-brand-fg-muted bg-brand-surface-2 border border-brand-border rounded px-2 py-0.5"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  )
}
