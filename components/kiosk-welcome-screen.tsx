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
      <section className="relative min-h-0 flex-[7] overflow-hidden bg-zinc-950">
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

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />
      </section>

      <section className="relative flex flex-[3] items-center justify-center overflow-hidden bg-white px-8 py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 -translate-y-full bg-gradient-to-b from-transparent via-white/72 to-white" />
        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-5">
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
              Formas de pagamento aceitas
            </p>

            <div className="rounded-[1.75rem] border border-zinc-200 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <Image
                src="/payment-methods-strip.svg"
                alt="Visa, Mastercard, Hipercard, Hiper, American Express, Diners Club, Cabal, Elo, Pluxee, Alelo, Pix, QR Code, Apple Pay, Google Pay e Samsung Pay"
                width={1280}
                height={144}
                className="h-auto w-full max-w-[52rem] object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
