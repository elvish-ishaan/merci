'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Settings, LogOut, Rocket, Zap, Clock, GitBranch, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Projects', icon: LayoutGrid },
  { href: '/dashboard/mercio', label: 'Mercio', icon: Zap },
  { href: '/dashboard/mercob', label: 'Mercob', icon: Clock },
  { href: '/dashboard/actions', label: 'Actions', icon: GitBranch },
  { href: '/dashboard/sandbox', label: 'Sandbox', icon: Box },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('email')
    if (stored) {
      setEmail(stored)
      return
    }
    // Fallback: decode JWT payload to extract email for existing sessions
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
        if (payload.email) {
          setEmail(payload.email)
          localStorage.setItem('email', payload.email)
        }
      } catch {
        // token is not a JWT or payload is unreadable
      }
    }
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    router.push('/login')
  }

  const initials = email
    ? (email.split('@')[0] ?? '').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col h-screen">
      <div className="px-4 py-5">
        <span className="font-semibold tracking-wider text-base">Mercy</span>
      </div>

      <div className="px-3 pb-4">
        <Button asChild className="w-full p-6 justify-start gap-2" size="sm">
          <Link href="/dashboard?deploy=true">
            <Rocket className="w-3.5 h-3.5" />
            Deploy Now
          </Link>
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground/80 truncate flex-1">{email ?? '—'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground px-2"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
