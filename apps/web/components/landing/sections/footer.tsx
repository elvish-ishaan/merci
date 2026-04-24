import Link from 'next/link'
import { Logo } from '@/components/landing/logo'
import { GithubIcon } from '@/components/landing/github-icon'

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Deployments', href: '#deployments' },
      { label: 'Mercio', href: '#mercio' },
      { label: 'Mercob', href: '#mercob' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Docs', href: '#docs' },
      { label: 'Changelog', href: '#changelog' },
      { label: 'Status', href: '#status' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '#terms' },
      { label: 'Privacy', href: '#privacy' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-brand-bg-elev">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono-brand text-sm text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
            >
              <Logo />
              <span>mercy</span>
            </Link>
            <p className="mt-3 text-xs text-brand-fg-muted">
              The deploy platform for developers who ship fast.
            </p>
            <a
              href="https://github.com/elvish-ishaan/merci"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Mercy on GitHub"
              className="mt-4 inline-flex items-center gap-2 text-xs text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="font-mono-brand text-xs font-semibold text-brand-fg-strong">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 border-t border-brand-border pt-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-mono-brand text-xs text-brand-fg-muted">
            © {new Date().getFullYear()} Mercy. All rights reserved.
          </p>
          <a
            href="https://github.com/elvish-ishaan/merci"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Mercy on GitHub"
            className="inline-flex items-center gap-1.5 font-mono-brand text-xs text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            elvish-ishaan/merci
          </a>
        </div>
      </div>
    </footer>
  )
}
