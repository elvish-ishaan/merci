'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, ChevronDown, GitBranch, Zap, Clock } from 'lucide-react'
import { Logo } from './logo'
import { CtaButton } from './cta-button'
import { navLinks, productLinks } from './nav-links'
import { GithubIcon } from './github-icon'

const productIcons = {
  Deployments: <GitBranch className="h-4 w-4" />,
  Mercio: <Zap className="h-4 w-4" />,
  Mercob: <Clock className="h-4 w-4" />,
} as const

export function Navbar() {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstLinkRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) toggleRef.current?.focus()
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border/60 bg-brand-bg/70 backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono-brand text-base text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
        >
          <Logo />
          <span className="tracking-tight">mercy</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 md:flex">

          {/* Products dropdown */}
          <li className="group relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
            >
              Products
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>

            {/* Dropdown panel */}
            <div className="invisible absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {/* bridge keeps hover active while moving cursor from button to panel */}
              <div className="absolute -top-3 left-0 h-3 w-full" />
              <div className="w-[680px] overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-[0_16px_48px_-8px_rgba(0,0,0,0.7)]">
                <div className="border-b border-brand-border px-6 py-4">
                  <p className="font-mono-brand text-xs text-brand-fg-muted">Products</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-brand-border">
                  {productLinks.map((product) => (
                    <Link
                      key={product.name}
                      href={product.href}
                      className="flex flex-col gap-3 p-6 transition-colors hover:bg-brand-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-accent"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-brand-bg text-brand-accent">
                        {productIcons[product.name as keyof typeof productIcons]}
                      </span>
                      <div>
                        <p className="font-mono-brand text-sm font-semibold text-brand-fg-strong">
                          {product.name}
                        </p>
                        <p className="mt-1.5 text-sm text-brand-fg-muted leading-relaxed">{product.desc}</p>
                      </div>
                      <span className="mt-auto font-mono-brand text-xs text-brand-accent">
                        Learn more →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </li>

          {/* Plain links */}
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          <a
            href="https://github.com/elvish-ishaan/merci"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
            className="inline-flex h-9 w-9 items-center justify-center rounded text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <GithubIcon />
          </a>
          <Link
            href="/login"
            className="px-3 py-2 text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-3 py-2 text-sm text-brand-fg-muted transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            Sign up
          </Link>
          <CtaButton href="/register" variant="brand" className="ml-2">
            Get started
          </CtaButton>
        </div>

        {/* Mobile hamburger */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded text-brand-fg transition-colors hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="md:hidden"
        >
          <div className="border-t border-brand-border bg-brand-surface">
            {/* Products sub-section */}
            <div className="border-b border-brand-border px-6 py-4">
              <p className="mb-3 font-mono-brand text-xs text-brand-fg-muted">Products</p>
              <ul className="space-y-1">
                {productLinks.map((product, i) => (
                  <li key={product.name}>
                    <Link
                      ref={i === 0 ? firstLinkRef : undefined}
                      href={product.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-brand-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-accent"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-brand-border bg-brand-bg text-brand-accent">
                        {productIcons[product.name as keyof typeof productIcons]}
                      </span>
                      <div>
                        <p className="font-mono-brand text-sm text-brand-fg-strong">{product.name}</p>
                        <p className="text-xs text-brand-fg-muted">{product.desc}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Plain links */}
            <ul className="flex flex-col py-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-3 text-sm text-brand-fg-muted transition-colors hover:bg-brand-surface-2 hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/elvish-ishaan/merci"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 text-sm text-brand-fg-muted transition-colors hover:bg-brand-surface-2 hover:text-brand-fg-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-accent"
                >
                  <GithubIcon className="h-4 w-4" />
                  GitHub
                </a>
              </li>
            </ul>

            {/* Auth CTAs */}
            <div className="border-t border-brand-border px-6 py-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-[8px] border border-brand-border px-4 py-2.5 text-center text-sm text-brand-fg transition-colors hover:bg-brand-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-[8px] border border-brand-border px-4 py-2.5 text-center text-sm text-brand-fg transition-colors hover:bg-brand-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                >
                  Sign up
                </Link>
              </div>
              <CtaButton href="/register" variant="brand" className="mt-3 w-full justify-center">
                Get started
              </CtaButton>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
