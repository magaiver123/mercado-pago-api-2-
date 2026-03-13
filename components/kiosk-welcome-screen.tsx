"use client"

import type { MouseEvent } from "react"
import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

type Slide = {
  id: string
  image_url: string
  duration: number
}

export function KioskWelcomeScreen() {
  const router = useRouter()

  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)

  async function loadSlides() {
    const response = await fetch("/api/kiosk/slides", { cache: "no-store" })
    if (!response.ok) return

    const data = await response.json().catch(() => null)
    if (!Array.isArray(data)) return

    setSlides(data)
    setCurrentSlide((prev) => (prev >= data.length ? 0 : prev))
  }

  useEffect(() => {
    loadSlides()

    const pollingId = setInterval(() => {
      loadSlides()
    }, 5000)

    return () => {
      clearInterval(pollingId)
    }
  }, [])

  const goToNextSlide = useCallback(() => {
    if (isAnimating || slides.length <= 1) return

    setIsAnimating(true)

    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
      setIsAnimating(false)
    }, 800)
  }, [isAnimating, slides.length])

  useEffect(() => {
    if (!slides.length) return

    const duration = slides[currentSlide]?.duration ?? 5
    const timer = setTimeout(goToNextSlide, duration * 1000)

    return () => clearTimeout(timer)
  }, [currentSlide, slides, goToNextSlide])

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulsing((prev) => !prev)
    }, 2000)

    return () => clearInterval(pulseInterval)
  }, [])

  const handleStartOrder = () => {
    router.push("/auth/login")
  }

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    handleStartOrder()
  }

  if (!slides.length) return null

  const currentSlideData = slides[currentSlide]
  const nextSlideIndex = slides.length > 1 ? (currentSlide + 1) % slides.length : currentSlide
  const nextSlideData = slides[nextSlideIndex]

  if (!currentSlideData?.image_url || !nextSlideData?.image_url) return null

  return (
    <div
      className="relative flex h-screen w-screen cursor-pointer select-none flex-col overflow-hidden bg-white text-zinc-950"
      onClick={handleStartOrder}
    >
      <section className="relative min-h-0 flex-[7.9] overflow-hidden bg-zinc-950">
        <div className="absolute inset-0">
          <Image
            src={nextSlideData.image_url}
            alt="Slide promocional"
            fill
            className="object-cover object-center"
          />
        </div>

        <div
          className={`absolute inset-0 transition-all duration-800 ease-out ${
            isAnimating ? "scale-105 opacity-0" : "scale-100 opacity-100"
          }`}
          style={{ transitionDuration: "800ms" }}
        >
          <Image
            src={currentSlideData.image_url}
            alt="Slide promocional"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/22 via-transparent to-black/22" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/28 via-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white via-white/74 to-transparent" />
      </section>

      <section className="relative -mt-12 flex flex-[2.1] items-center justify-center overflow-hidden bg-transparent px-8 pb-7 pt-4">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-white/88 to-white" />
        <div className="absolute inset-x-0 bottom-0 top-10 rounded-t-[2.5rem] bg-white shadow-[0_-14px_40px_rgba(15,23,42,0.08)]" />
        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-4">
          <button
            onClick={handleButtonClick}
            className={`min-w-[21rem] rounded-[1.75rem] bg-orange-500 px-12 py-5 text-xl font-extrabold tracking-[0.01em] text-white shadow-[0_16px_35px_rgba(249,115,22,0.35)] transition-all duration-300 hover:bg-orange-600 ${
              isPulsing ? "scale-[1.02] shadow-[0_18px_42px_rgba(249,115,22,0.42)]" : "scale-100"
            }`}
          >
            Iniciar compra
          </button>

          <div className="h-px w-full max-w-sm bg-gradient-to-r from-transparent via-orange-200 to-transparent" />

          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-400">
              FORMAS DE PAGAMENTO ACEITAS
            </p>

            <div className="w-full max-w-[58rem] rounded-[1.5rem] border border-zinc-200/90 bg-zinc-50 px-3 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
              <Image
                src="/payment-methods-strip.svg"
                alt="Visa, Mastercard, Hipercard, Hiper, American Express, Diners Club, Cabal, Elo, Pluxee, Alelo, Pix, QR Code, Apple Pay, Google Pay e Samsung Pay"
                width={1680}
                height={120}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
