import { UserprofileLandingAjuda } from "@/components/userprofile/landing-ajuda"
import { UserprofileLandingComoComprar } from "@/components/userprofile/landing-como-comprar"
import { UserprofileLandingFooter } from "@/components/userprofile/landing-footer"
import { UserprofileLandingHero } from "@/components/userprofile/landing-hero"
import { UserprofileLandingNavbar } from "@/components/userprofile/landing-navbar"
import { UserprofileSmoothScroll } from "@/components/userprofile/smooth-scroll"

export default function UserprofilePage() {
  return (
    <UserprofileSmoothScroll>
      <main className="relative min-h-screen bg-zinc-950 userprofile-theme">
        <div className="up-noise-overlay" aria-hidden="true" />
        <UserprofileLandingNavbar />
        <UserprofileLandingHero />
        <UserprofileLandingComoComprar />
        <UserprofileLandingAjuda />
        <UserprofileLandingFooter />
      </main>
    </UserprofileSmoothScroll>
  )
}
