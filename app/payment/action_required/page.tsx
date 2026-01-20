"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { clearAuthUser } from "@/lib/auth-store"
import { useEffect, useRef } from "react"

export default function ActionRequiredPage() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      clearAuthUser()
      router.push("/")
    }, 15000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [router])

  const handleReturn = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    clearAuthUser()
    router.push("/")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-orange-500">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <div className="bg-white/20 rounded-full p-6">
            <AlertCircle className="h-32 w-32 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Ação necessária
          </h1>

          <p className="text-white/90 text-xl">
            Seu pagamento exige uma confirmação adicional no terminal ou no
            aplicativo do banco.
          </p>
        </div>

        <Button
          onClick={handleReturn}
          size="lg"
          className="bg-white text-orange-600 hover:bg-white/90 mt-4 px-12 py-6 text-lg font-semibold"
        >
          Voltar ao Início
        </Button>
      </div>
    </main>
  )
}
