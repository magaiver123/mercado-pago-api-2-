"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"


const promotionalSlides = [
  {
    id: 1,
    src: "/refreshing-coca-cola-pepsi-soda-drinks-cans-bottle.jpg",
    alt: "Promoção de Refrigerantes",
    title: "Mate sua sede",
    subtitle: "Refrigerantes gelados",
  },
  {
    id: 2,
    src: "/energy-drinks-red-bull-monster-can-neon-glow-promo.jpg",
    alt: "Energéticos em Destaque",
    title: "Energia total",
    subtitle: "Para você ir além",
  },
  {
    id: 3,
    src: "/brazilian-snacks-coxinha-empada-salgados-golden-fr.jpg",
    alt: "Salgados Deliciosos",
    title: "Salgados",
    subtitle: "Fresquinhos para você",
  },
  {
    id: 4,
    src: "/ice-cold-juice-orange-natural-fresh-glass-promotio.jpg",
    alt: "Sucos Naturais",
    title: "100% Natural",
    subtitle: "Sucos da fruta",
  },
  {
    id: 5,
    src: "/hot-dog-sandwich-snack-combo-meal-promotional-appe.jpg",
    alt: "Combos Especiais",
    title: "Combos",
    subtitle: "O melhor preço",
  },
  {
    id: 6,
    src: "/ice-cream-sundae-milkshake-dessert-sweet-promotion.jpg",
    alt: "Sobremesas Geladas",
    title: "Sobremesas",
    subtitle: "Docinho da tarde",
  },
]

export function KioskWelcomeScreen() {
  const router = useRouter()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [nextSlideIndex, setNextSlideIndex] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPulsing, setIsPulsing] = useState(true)

  const goToNextSlide = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setNextSlideIndex((currentSlide + 1) % promotionalSlides.length)

    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % promotionalSlides.length)
      setIsAnimating(false)
    }, 800)
  }, [currentSlide, isAnimating])

  useEffect(() => {
    const interval = setInterval(goToNextSlide, 5000)
    return () => clearInterval(interval)
  }, [goToNextSlide])

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setIsPulsing((prev) => !prev)
    }, 2000)
    return () => clearInterval(pulseInterval)
  }, [])

  const handleStartOrder = () => {
  router.push("/auth/login")
}

  const currentSlideData = promotionalSlides[currentSlide]
  const nextSlideData = promotionalSlides[nextSlideIndex]

  return (
    <div
      className="relative mx-auto aspect-[16/10] w-full max-w-[1280px] overflow-hidden bg-black cursor-pointer"
      onClick={handleStartOrder}
    >
      <div className="absolute inset-0">
        <Image src={nextSlideData.src || "/placeholder.svg"} alt={nextSlideData.alt} fill className="object-cover" />
      </div>

      <div
        className={`absolute inset-0 transition-all duration-800 ease-out ${
          isAnimating ? "opacity-0 scale-110" : "opacity-100 scale-100"
        }`}
        style={{ transitionDuration: "800ms" }}
      >
        <Image
          src={currentSlideData.src || "/placeholder.svg"}
          alt={currentSlideData.alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />

      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(249,115,22,0.15)]" />

      <div
        className={`absolute left-6 top-1/4 transition-all duration-500 ${
          isAnimating ? "opacity-0 -translate-x-8" : "opacity-100 translate-x-0"
        }`}
      >
        <span className="mb-2 inline-block rounded-full bg-orange-500/90 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          Destaque
        </span>
        <h2 className="text-3xl font-black uppercase text-white drop-shadow-2xl">{currentSlideData.title}</h2>
        <p className="mt-1 text-base font-light text-white/90 drop-shadow-lg">{currentSlideData.subtitle}</p>
      </div>

      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        {promotionalSlides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              setCurrentSlide(index)
            }}
            className={`group relative h-2.5 w-2.5 transition-all duration-300 ${
              index === currentSlide ? "scale-125" : "hover:scale-110"
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          >
            <span
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                  : "bg-white/40 group-hover:bg-white/70"
              }`}
            />
            {index === currentSlide && <span className="absolute inset-0 animate-ping rounded-full bg-orange-500/50" />}
          </button>
        ))}
      </div>

      <div className="absolute left-0 top-0 h-1 w-full bg-black/30">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all ease-linear"
          style={{
            width: `${((currentSlide + 1) / promotionalSlides.length) * 100}%`,
            transitionDuration: isAnimating ? "800ms" : "0ms",
          }}
        />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={handleStartOrder}
          className={`group relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 text-base font-bold text-white shadow-[0_8px_30px_rgba(249,115,22,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_40px_rgba(249,115,22,0.6)] active:scale-95 ${
            isPulsing ? "animate-pulse" : ""
          }`}
          style={{ animationDuration: "2s" }}
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <span className="absolute inset-0 rounded-xl border-2 border-white/20" />

          <span className="relative flex items-center gap-2">
            Começar pedido
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">
          <svg className="h-5 w-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="text-white">
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/60">Pegue, pague, pronto</p>
          <p className="text-sm font-bold">MR SMART</p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-orange-500/30"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
