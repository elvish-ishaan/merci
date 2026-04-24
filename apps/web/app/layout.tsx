import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mercy — the deploy platform for developers',
  description:
    'Ship services in seconds. A developer-first platform for deploying and observing your apps.',
  openGraph: {
    title: 'Mercy — the deploy platform for developers',
    description: 'Ship services in seconds.',
    type: 'website',
  },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-screen">{children}</body>
    </html>
  )
}
