"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";
import { getPaymentRouteByStatus, normalizePointOrderStatus } from "@/lib/mercadopago-point-status";

type PaymentMethod = "credit_card" | "debit_card" | "pix";

const ORANGE_ICON_FILTER =
  "invert(55%) sepia(94%) saturate(1322%) hue-rotate(355deg) brightness(101%) contrast(101%)";

function getPaymentMethod(value: string | null): PaymentMethod {
  if (value === "pix" || value === "debit_card" || value === "credit_card") {
    return value;
  }
  return "credit_card";
}

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const method = getPaymentMethod(searchParams.get("method"));

  const [status, setStatus] = useState<string>("processing");
  const [cancelling, setCancelling] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const { clearCart } = useCartStore();

  const helperText = useMemo(() => {
    if (method === "pix") {
      return "Abra seu aplicativo do banco e escaneie o QR Code na m\u00E1quina de cart\u00E3o ao lado do tablet";
    }

    return "Aproxime ou insira seu cart\u00E3o na m\u00E1quina de cart\u00E3o ao lado do tablet";
  }, [method]);

  const methodIcon = method === "pix" ? "/payment-icons/pix.gif" : "/payment-icons/card.gif";

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const handleSwitchPayment = async () => {
    if (cancelling) return;

    setCancelling(true);

    try {
      const fallbackOrderId =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("activeOrderId")
          : null;
      const cancelOrderId = orderId || fallbackOrderId;

      if (cancelOrderId) {
        const response = await fetch(`/api/mercadopago/cancel-order?orderId=${cancelOrderId}`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Nao foi possivel cancelar o pedido");
        }
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("activeOrderId");
      }

      router.push("/checkout");
    } catch (error) {
      console.error("[processing] switch payment error:", error);
      alert(error instanceof Error ? error.message : "Erro ao cancelar pedido.");
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      router.push("/checkout");
      return;
    }

    const maxWaitTimeSeconds = 60;
    let intervalId: NodeJS.Timeout;
    let timerId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(`/api/mercadopago/order-status?orderId=${orderId}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json().catch(() => null);
        if (!data || typeof data.status !== "string") return;

        const normalizedStatus = normalizePointOrderStatus(data.status);
        setStatus(normalizedStatus);

        const nextCreatedAt = typeof data.createdAt === "string" ? data.createdAt : createdAt;
        if (!createdAt && typeof data.createdAt === "string") {
          setCreatedAt(data.createdAt);
        }

        if (nextCreatedAt) {
          const createdAtTs = new Date(nextCreatedAt).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - createdAtTs) / 1000);
          const remaining = Math.max(maxWaitTimeSeconds - elapsedSeconds, 0);
          setRemainingTime(remaining);

          if (remaining <= 0) {
            setTimeoutReached(true);
          }
        }

        const nextRoute = getPaymentRouteByStatus(normalizedStatus);
        if (nextRoute) {
          router.push(`${nextRoute}?orderId=${orderId}&method=${method}`);
        }
      } catch (err) {
        console.error("[processing] error checking order:", err);
      }
    };

    timerId = setInterval(() => {
      setRemainingTime((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    checkOrderStatus();
    intervalId = setInterval(checkOrderStatus, 3000);

    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
    };
  }, [orderId, router, createdAt, method]);

  return (
    <main className="min-h-screen bg-white px-4 pb-28 pt-8 sm:pt-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <Image
          src="/LOGOMR.png"
          alt="Logo MR"
          width={112}
          height={112}
          priority
          className="h-auto w-[112px]"
        />

        <div className="mt-8 flex h-36 w-36 items-center justify-center rounded-full border-2 border-orange-200 bg-orange-50">
          <Image
            src={methodIcon}
            alt="Metodo de pagamento"
            width={96}
            height={96}
            className="h-24 w-24 object-contain"
            style={{ filter: ORANGE_ICON_FILTER }}
          />
        </div>

        <div className="mt-8 space-y-4">
          <h1 className="text-3xl font-black text-black">Pagamento em andamento</h1>
          <p className="text-base font-medium leading-relaxed text-black/75">{helperText}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-xs text-black/65">
          <p>Status: {status}</p>
          <p>Tempo restante: {remainingTime}s / 60s</p>
          <p>
            {timeoutReached
              ? "Ainda estamos aguardando resposta final do terminal."
              : "Se o terminal ja iniciou, a troca cancela antes de voltar para o checkout."}
          </p>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-4">
        <div className="mx-auto w-full max-w-md">
          <Button
            onClick={handleSwitchPayment}
            disabled={cancelling}
            className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
          >
            {cancelling ? "Cancelando..." : "Trocar forma de pagamento"}
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white">
          <Spinner className="h-16 w-16 text-orange-500" />
        </main>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
