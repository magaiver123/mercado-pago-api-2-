"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

/* ================= SUPABASE ================= */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ================= TIPOS ================= */

type Slide = {
  id: string
  image_url: string
  duration: number
}

/* ================= COMPONENT ================= */

export function KioskWelcomeScreen() {
  const router = useRouter()

  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)

  /* ================= LOAD SLIDES ================= */

  async function loadSlides() {
    const { data } = await supabase
      .from("kiosk_slides")
      .select("id, image_url, duration")
      .eq("active", true)
      .order("order", { ascending: true })

    if (data) {
      setSlides(data)
      setCurrentSlide(0)
    }
  }

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadSlides()
  }, [])

  /* ================= REALTIME ================= */

  useEffect(() => {
    const channel = supabase
      .channel("kiosk-slides-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kiosk_slides" },
        payload => {
          console.log("📡 REALTIME EVENT:", payload)
          loadSlides()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /* ================= SLIDE LOOP ================= */

  const goToNextSlide = useCallback(() => {
    if (isAnimating || slides.length <= 1) return

    setIsAnimating(true)

    setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
      setIsAnimating(false)
    }, 800)
  }, [isAnimating, slides.length])

  useEffect(() => {
    if (!slides.length) return

    const duration = slides[currentSlide]?.duration ?? 5
    const timer = setTimeout(goToNextSlide, duration * 1000)

    return () => clearTimeout(timer)
  }, [currentSlide, slides, goToNextSlide])

  /* ================= PULSE ================= */

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulsing(prev => !prev)
    }, 2000)

    return () => clearInterval(pulseInterval)
  }, [])

  /* ================= ACTION ================= */

  const handleStartOrder = () => {
    router.push("/auth/login")
  }

  if (!slides.length) return null

  const currentSlideData = slides[currentSlide]

  const nextSlideIndex =
    slides.length > 1
      ? (currentSlide + 1) % slides.length
      : currentSlide

  const nextSlideData = slides[nextSlideIndex]

  if (!currentSlideData?.image_url || !nextSlideData?.image_url) return null

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black cursor-pointer"
      onClick={handleStartOrder}
    >
      {/* NEXT SLIDE (BACKGROUND) */}
      <div className="absolute inset-0">
        <Image
          src={nextSlideData.image_url}
          alt="Slide"
          fill
          className="object-cover"
        />
      </div>

      {/* CURRENT SLIDE (ANIMATED) */}
      <div
        className={`absolute inset-0 transition-all duration-800 ease-out ${
          isAnimating ? "opacity-0 scale-110" : "opacity-100 scale-100"
        }`}
        style={{ transitionDuration: "800ms" }}
      >
        <Image
          src={currentSlideData.image_url}
          alt="Slide"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <button
          onClick={handleStartOrder}
          className={`rounded-xl bg-orange-600 px-10 py-4 text-white font-bold transition ${
            isPulsing ? "animate-pulse" : ""
          }`}
        >
          Começar pedido
        </button>
      </div>
    </div>
  )
}
