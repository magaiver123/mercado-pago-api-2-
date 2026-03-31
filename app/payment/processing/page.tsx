"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useCartStore } from "@/lib/cart-store";
import { getPaymentRouteByStatus, normalizePointOrderStatus } from "@/lib/mercadopago-point-status";
import { SwitchPaymentButton } from "@/components/payment/switch-payment-button";

type PaymentMethod = "credit_card" | "debit_card" | "pix";

function getPaymentMethod(value: string | null): PaymentMethod {
  if (value === "pix" || value === "debit_card" || value === "credit_card") {
    return value;
  }
  return "credit_card";
}

function getFriendlyStatusTitle(status: string): string {
  switch (status) {
    case "created":
      return "Preparando terminal...";
    case "pending":
      return "Iniciando pagamento...";
    case "processing":
      return "Processando pagamento...";
    case "at_terminal":
      return "Aguardando no terminal";
    case "action_required":
      return "Confirme no terminal";
    case "processed":
      return "Pagamento aprovado";
    case "failed":
    case "error":
      return "Pagamento não autorizado";
    case "canceled":
      return "Pagamento cancelado";
    case "expired":
      return "Tempo para pagamento expirou";
    case "refunded":
      return "Pagamento reembolsado";
    default:
      return "Verificando pagamento";
  }
}

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const method = getPaymentMethod(searchParams.get("method"));

  const [status, setStatus] = useState<string>("processing");
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const { clearCart } = useCartStore();

  const helperText = useMemo(() => {
    if (method === "pix") {
      return "Escaneie o QR Code na maquininha.";
    }

    return "Aproxime ou insira seu cartão na maquininha.";
  }, [method]);

  const methodIcon = method === "pix" ? "/animated_phone_loop_v3.svg" : "/payment-icons/card.gif";
  const statusTitle = useMemo(() => getFriendlyStatusTitle(status), [status]);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

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
          src="/logologin.png"
          alt="Logo MR"
          width={260}
          height={120}
          priority
          className="h-auto w-[240px] sm:w-[260px]"
        />

        <Image
          src={methodIcon}
          alt="Método de pagamento"
          width={280}
          height={280}
          className="mt-8 h-[260px] w-[260px] animate-[iconFloat_2.4s_ease-in-out_infinite] object-contain sm:h-[300px] sm:w-[300px]"
        />

        <div className="mt-8 space-y-4">
          <h1 className="w-full truncate whitespace-nowrap text-2xl font-black text-black sm:text-3xl">
            {statusTitle}
          </h1>
          <p className="w-full truncate whitespace-nowrap text-sm font-medium text-black/75 sm:text-base">
            {helperText}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-xs text-black/65">
          <p>Tempo restante: {remainingTime}s / 60s</p>
          <p className="w-full truncate whitespace-nowrap text-[11px] sm:text-xs">
            {timeoutReached
              ? "Aguardando resposta final do terminal."
              : "Troca disponível enquanto o terminal não iniciar."}
          </p>
        </div>
      </div>

      <SwitchPaymentButton />

      <style jsx>{`
        @keyframes iconFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
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
