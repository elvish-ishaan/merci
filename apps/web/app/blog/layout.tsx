import type { ReactNode } from 'react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/sections/footer'

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-theme min-h-screen flex flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
