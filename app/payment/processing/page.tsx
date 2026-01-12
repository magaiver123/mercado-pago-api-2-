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
  const [elapsedTime, setElapsedTime] = useState(0);

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
        alert("Pedido cancelado com sucesso!");
        router.push("/");
      } else {
        const errorMessage = data.error || "Erro desconhecido";
        alert(errorMessage);
        setCancelling(false);
      }
    } catch (error) {
      console.error("[v0] Exception during cancel:", error);
      alert("Erro ao cancelar pedido. Tente cancelar manualmente no terminal.");
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
    let timeoutId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(
          `/api/mercadopago/order-status?orderId=${orderId}`
        );
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        setStatus(data.status);

        if (data.status === "processed" && data.statusDetail === "accredited") {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          router.push("/payment/success");
        } else if (
          data.status === "cancelled" ||
          data.status === "canceled" ||
          data.status === "rejected" ||
          data.status === "error" ||
          data.status === "failed"
        ) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          router.push("/payment/error");
        }
      } catch (err) {
        console.error("[v0] Error checking order status:", err);
      }
    };

    const timeIntervalId = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      clearInterval(timeIntervalId);
      router.push("/payment/error");
    }, maxWaitTimeSeconds * 1000);

    checkOrderStatus();
    intervalId = setInterval(checkOrderStatus, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      if (timeIntervalId) clearInterval(timeIntervalId);
    };
  }, [orderId, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md bg-white border border-orange-500">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-black">Processando Pagamento</CardTitle>
          <CardDescription className="text-black/70">
            Aguarde enquanto verificamos o status do seu pagamento...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-white rounded-lg p-4 space-y-1 border border-orange-500">
            <p className="text-xs text-black/70">Status: {status}</p>
            <p className="text-xs text-black/70">
              Tempo decorrido: {elapsedTime}s / 60s
            </p>
          </div>

          <div className="bg-orange-100 border border-orange-500 rounded-lg p-3">
            <p className="text-xs text-orange-700">
              Nota: Se o pagamento já estiver sendo processado no terminal, você
              precisará cancelar diretamente na máquina.
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
