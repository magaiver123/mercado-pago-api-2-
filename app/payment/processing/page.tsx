"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart-store";

function ProcessingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [status, setStatus] = useState<string>("processing");
  const [cancelling, setCancelling] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const { clearCart } = useCartStore();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const handleCancelOrder = async () => {
    if (!orderId || cancelling) return;

    const confirmCancel = confirm(
      "Tem certeza que deseja cancelar este pedido?"
    );
    if (!confirmCancel) return;

    setCancelling(true);

    try {
      const response = await fetch(
        `/api/mercadopago/cancel-order?orderId=${orderId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.ok) {
        router.push("/payment/canceled");
      } else {
        alert(data.error || "Erro desconhecido");
        setCancelling(false);
      }
    } catch (error) {
      console.error("[processing] cancel error:", error);
      alert("Erro ao cancelar pedido.");
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      router.push("/");
      return;
    }

    const maxWaitTimeSeconds = 60;

    let intervalId: NodeJS.Timeout;
    let timerId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(
          `/api/mercadopago/order-status?orderId=${orderId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json().catch(() => null);
        if (!data || typeof data.status !== "string") return;

        setStatus(data.status);

        const nextCreatedAt =
          typeof data.createdAt === "string" ? data.createdAt : createdAt;
        if (!createdAt && typeof data.createdAt === "string") {
          setCreatedAt(data.createdAt);
        }

        if (!nextCreatedAt) return;

        const createdAtTs = new Date(nextCreatedAt).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - createdAtTs) / 1000);
        const remaining = Math.max(maxWaitTimeSeconds - elapsedSeconds, 0);

        setRemainingTime(remaining);

        if (remaining <= 0) {
          router.push("/payment/expired");
          return;
        }

        if (data.status === "processed") {
          router.push("/payment/success");
        }

        if (data.status === "failed" || data.status === "error") {
          router.push("/payment/failed");
        }

        if (data.status === "canceled" || data.status === "cancelled") {
          router.push("/payment/canceled");
        }

        if (data.status === "expired") {
          router.push("/payment/expired");
        }

        if (data.status === "action_required") {
          router.push("/payment/action_required");
        }
      } catch (err) {
        console.error("[processing] Error checking order:", err);
      }
    };

    // Atualiza o contador visual a cada segundo
    timerId = setInterval(() => {
      setRemainingTime((prev) => Math.max(prev - 1, 0));
    }, 1000);

    checkOrderStatus();
    intervalId = setInterval(checkOrderStatus, 3000);

    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
    };
  }, [orderId, router, createdAt]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md bg-white border border-orange-500">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-black">
            Processando Pagamento
          </CardTitle>
          <CardDescription className="text-black/70">
            Aguarde enquanto verificamos o status do seu pagamento...
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className="bg-white rounded-lg p-4 space-y-1 border border-orange-500">
            <p className="text-xs text-black/70">Status: {status}</p>
            <p className="text-xs text-black/70">
              Tempo restante: {remainingTime}s / 60s
            </p>
          </div>

          <div className="bg-orange-100 border border-orange-500 rounded-lg p-3">
            <p className="text-xs text-orange-700">
              Nota: Se o pagamento já estiver sendo processado no terminal,
              você precisará cancelar diretamente na máquina.
            </p>
          </div>

          <Button
            onClick={handleCancelOrder}
            disabled={cancelling}
            variant="destructive"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {cancelling ? "Cancelando..." : "Cancelar Pedido"}
          </Button>
        </CardContent>
      </Card>
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
