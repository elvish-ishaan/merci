'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { GlobeIllustration } from '../../components/globe-illustration'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await api.register(email, password)
      localStorage.setItem('token', token)
      localStorage.setItem('email', email)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: globe illustration */}
      <div className="hidden md:flex flex-1 max-w-[50%] flex-col items-center justify-center border-r border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-7 px-8 w-full max-w-[600px]">
          <p className="self-start text-[11px] font-mono text-muted-foreground/50 tracking-wide">
            ~/edge-network
          </p>
          <GlobeIllustration />
          <div className="flex items-center gap-5 text-[11px] font-mono text-muted-foreground">
            <span>
              <span className="text-primary font-medium">7</span> regions
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="text-primary font-medium">40+</span> edge nodes
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="text-primary font-medium">&lt;30ms</span> p50 latency
            </span>
          </div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex flex-col justify-center px-10 py-14 w-full md:max-w-[480px] shrink-0">
        <Link
          href="/"
          className="mb-10 inline-block text-sm font-mono font-semibold text-foreground/70 hover:text-foreground transition-colors tracking-tight"
        >
          mercy
        </Link>

        <div className="bg-card border border-border rounded-xl p-8 space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start deploying your apps</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
