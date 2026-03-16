"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ReceiptPreview } from "@/components/ReceiptPreview"
import {
  clearReceiptFromSession,
  getReceiptFromSession,
} from "@/lib/receipt-types"
import { clearAuthUser } from "@/lib/auth-store"

export default function ReceiptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlOrderId = searchParams.get("orderId")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [receiptLoaded, setReceiptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [receipt] = useState(() => getReceiptFromSession())

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!receipt) {
      setError("Não encontramos os dados do comprovante deste pedido.")
      // volta para a tela de sucesso genérica após alguns segundos
      const id = setTimeout(() => {
        router.push("/payment/success")
      }, 4000)
      return () => clearTimeout(id)
    }

    if (urlOrderId && receipt.orderId !== urlOrderId) {
      // se o orderId não bater, ainda assim mostramos o comprovante mais recente
      console.warn(
        "[receipt] orderId from URL does not match stored receipt orderId",
      )
    }

    setReceiptLoaded(true)

    timeoutRef.current = setTimeout(() => {
      finishFlow()
    }, 180000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, urlOrderId])

  const finishFlow = () => {
    clearAuthUser()
    clearReceiptFromSession()
    router.push("/")
  }

  const cancelAutoTimeout = () => {
    setHasInteracted(true)
  }

  const handleViewReceipt = () => {
    cancelAutoTimeout()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handlePrint = () => {
    if (!receipt || isPrinting) return
    cancelAutoTimeout()
    setIsPrinting(true)

    try {
      window.print()
    } finally {
      setTimeout(() => {
        setIsPrinting(false)
      }, 4000)
    }
  }

  if (!receiptLoaded && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-4">
        <p className="text-black/80">Carregando comprovante...</p>
      </main>
    )
  }

  return (
    <main className="flex h-[100svh] w-full flex-col items-center overflow-hidden bg-[#f3f1ee] px-4 py-5">
      <div className="flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={180}
            height={60}
            className="h-12 w-auto sm:h-16"
          />
        </div>

        <div className="mt-5 space-y-2 text-center">
          <h1 className="text-3xl font-bold text-black sm:text-4xl">
            Pronto
            {receipt?.customerName ? `, ${receipt.customerName}` : ","}
          </h1>
          <p className="text-lg font-bold text-black sm:text-xl">
            Aqui está o seu comprovante
          </p>
          {receipt?.orderId && (
            <p className="text-sm font-semibold text-orange-500">
              Nº do pedido: {receipt.orderId}
            </p>
          )}
          <p className="pt-1 text-sm font-medium text-black/80 sm:text-base">
            Abra a geladeira e retire os itens do seu pedido
          </p>
        </div>

        <div className="mt-5 grid flex-1 gap-4 md:grid-cols-2 md:gap-6">
          <button
            onClick={handleViewReceipt}
            className="flex h-[min(28vh,220px)] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-orange-500 bg-white p-5 text-center shadow-sm transition hover:border-orange-600 hover:shadow-md md:aspect-square md:h-auto md:gap-4 md:p-6"
          >
            <div className="relative h-14 w-14 md:h-20 md:w-20">
              <Image
                src="/receipt/10.svg"
                alt="Ver Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-xl font-semibold text-black md:text-2xl">
              Ver Nota
            </h2>
          </button>

          <button
            onClick={handlePrint}
            className="flex h-[min(28vh,220px)] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-orange-500 bg-orange-500 p-5 text-center text-white shadow-sm transition hover:bg-orange-600 hover:shadow-md md:aspect-square md:h-auto md:gap-4 md:p-6"
          >
            <div className="relative h-14 w-14 md:h-20 md:w-20">
              <Image
                src="/receipt/11.svg"
                alt="Imprimir Nota"
                fill
                className="object-contain"
              />
            </div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Imprimir Nota
            </h2>
            <div className="text-xs text-white/90">
              {isPrinting ? "Enviando para impressão..." : "Toque para imprimir"}
            </div>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {!hasInteracted && (
          <p className="mt-3 text-center text-xs text-black/60">
            Se você não tocar na tela, retornaremos automaticamente ao início
            em 3 minutos.
          </p>
        )}
      </div>

      <div id="printable-receipt" className="pointer-events-none fixed inset-0 z-[-1] flex items-center justify-center p-4">
        {receipt && <ReceiptPreview receipt={receipt} />}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-white p-6">
          {receipt && <ReceiptPreview receipt={receipt} />}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
              onClick={handleCloseModal}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-auto flex justify-center bg-gradient-to-t from-[#f3f1ee] via-[#f3f1ee]/95 to-transparent pb-2 pt-4">
        <Button
          size="lg"
          className="h-12 min-w-[240px] rounded-full bg-orange-500 text-base font-semibold text-white shadow-md hover:bg-orange-600 sm:h-14 sm:min-w-[260px] sm:text-lg"
          onClick={finishFlow}
        >
          Finalizar pedido
        </Button>
      </div>
    </main>
  )
}

