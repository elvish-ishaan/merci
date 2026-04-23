'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Settings, LogOut, Rocket, Zap, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Projects', icon: LayoutGrid },
  { href: '/dashboard/mercio', label: 'Mercio', icon: Zap },
  { href: '/dashboard/mercob', label: 'Mercob', icon: Clock },
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
    <aside className="w-56 shrink-0 border-r border-neutral-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-5">
        <span className="font-semibold tracking-tight text-base">mercy</span>
      </div>

      {/* Deploy button */}
      <div className="px-3 pb-4">
        <Button asChild className="w-full justify-start gap-2" size="sm">
          <Link href="/dashboard?deploy=true">
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </Link>
        </Button>
      </div>

      <Separator className="bg-neutral-800" />

      {/* Nav links */}
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
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-neutral-800" />

      {/* Profile + sign out */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs bg-neutral-700 text-neutral-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-neutral-300 truncate flex-1">{email ?? '—'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-neutral-400 hover:text-white px-2"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
