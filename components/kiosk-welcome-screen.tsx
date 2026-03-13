"use client"

import type { MouseEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

type Slide = {
  id: string
  image_url: string
  duration: number
}

export function KioskWelcomeScreen() {
  const SLIDE_TRANSITION_MS = 650
  const router = useRouter()

  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [incomingSlide, setIncomingSlide] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (isAnimating || incomingSlide !== null || slides.length <= 1) return

    const nextSlide = (currentSlide + 1) % slides.length

    setIncomingSlide(nextSlide)
    setIsAnimating(false)

    setTimeout(() => {
      setIsAnimating(true)
    }, 16)

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }

    transitionTimerRef.current = setTimeout(() => {
      setCurrentSlide(nextSlide)
      setIncomingSlide(null)
      setIsAnimating(false)
      transitionTimerRef.current = null
    }, SLIDE_TRANSITION_MS)
  }, [currentSlide, incomingSlide, isAnimating, slides.length, SLIDE_TRANSITION_MS])

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

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    }
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
  const incomingSlideData = incomingSlide !== null ? slides[incomingSlide] : null

  if (!currentSlideData?.image_url) return null

  return (
    <div
      className="relative flex h-screen w-screen cursor-pointer select-none flex-col overflow-hidden bg-white text-zinc-950"
      onClick={handleStartOrder}
    >
      <section className="relative min-h-0 flex-1 overflow-hidden bg-white">
        <div
          className={`absolute inset-0 transition-transform ease-out ${
            isAnimating ? "-translate-x-full" : "translate-x-0"
          }`}
          style={{ transitionDuration: `${SLIDE_TRANSITION_MS}ms` }}
        >
          <Image
            src={currentSlideData.image_url}
            alt="Slide promocional"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {incomingSlideData?.image_url && (
          <div
            className={`absolute inset-0 transition-transform ease-out ${
              isAnimating ? "translate-x-0" : "translate-x-full"
            }`}
            style={{ transitionDuration: `${SLIDE_TRANSITION_MS}ms` }}
          >
            <Image
              src={incomingSlideData.image_url}
              alt="Slide promocional"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/94 to-transparent" />
      </section>

      <section className="relative flex-none bg-white px-8 pb-10 pt-3">
        <div className="pointer-events-none absolute inset-x-0 -top-14 h-14 bg-gradient-to-b from-transparent to-white" />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-4">
          <button
            onClick={handleButtonClick}
            className={`w-full max-w-[26rem] rounded-[1.65rem] bg-orange-500 px-10 py-5 text-[1.9rem] font-bold tracking-[0.01em] text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)] transition-all duration-300 hover:bg-orange-500 ${
              isPulsing ? "scale-[1.01] shadow-[0_16px_28px_rgba(249,115,22,0.26)]" : "scale-100"
            }`}
          >
            Iniciar compra
          </button>

          <div className="flex w-full flex-col items-center gap-2.5">
            <p className="text-[0.78rem] font-medium uppercase tracking-[0.42em] text-zinc-400">
              FORMAS DE PAGAMENTO ACEITAS
            </p>

            <div className="w-full max-w-[48rem] rounded-full border border-zinc-200/80 bg-zinc-50/80 px-5 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
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
