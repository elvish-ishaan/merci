import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Pillars } from '@/components/landing/sections/pillars'
import { Deployments } from '@/components/landing/sections/deployments'
import { Mercio } from '@/components/landing/sections/mercio'
import { Mercob } from '@/components/landing/sections/mercob'
import { DxStrip } from '@/components/landing/sections/dx-strip'
import { ResourcesStrip } from '@/components/landing/sections/resources-strip'
import { Pricing } from '@/components/landing/sections/pricing'
import { FinalCta } from '@/components/landing/sections/final-cta'
import { Footer } from '@/components/landing/sections/footer'

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen">
      <Navbar />
      <main id="main">
        <Hero />
        <Pillars />
        <Deployments />
        <Mercio />
        <Mercob />
        <DxStrip />
        <ResourcesStrip />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
