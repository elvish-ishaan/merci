import type { ReactNode } from 'react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/sections/footer'
import { DocsSidebar } from './_components/docs-sidebar'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-theme min-h-screen flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 md:grid md:grid-cols-12 md:gap-10">
        <div className="md:col-span-3">
          <DocsSidebar />
        </div>
        <main id="main" className="md:col-span-9 min-w-0">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}
