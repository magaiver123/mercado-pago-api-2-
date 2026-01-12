"use client"

import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { clearAuthUser } from "@/lib/auth-store"
import { useEffect, useRef } from "react"

export default function ErrorPage() {
  const router = useRouter()

  // guarda a referência do timer
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ⏱️ auto redirect após 20 segundos
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      clearAuthUser()
      router.push("/")
    }, 10000)

    // limpeza do timer ao sair da tela
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [router])

  // 🔘 clique manual
  const handleTryAgain = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    clearAuthUser()
    router.push("/")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-red-600">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <div className="bg-white/20 rounded-full p-6">
            <XCircle className="h-32 w-32 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Seu pagamento foi recusado
          </h1>

          <p className="text-white/90 text-xl">
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </p>
        </div>

        <Button
          onClick={handleTryAgain}
          size="lg"
          className="bg-white text-red-600 hover:bg-white/90 mt-4 px-12 py-6 text-lg font-semibold"
        >
          Tentar Novamente
        </Button>
      </div>
    </main>
  )
}
