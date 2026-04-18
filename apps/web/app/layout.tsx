import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mercy — Deploy Platform',
  description: 'Deploy your React apps in seconds',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-screen">{children}</body>
    </html>
  )
}
