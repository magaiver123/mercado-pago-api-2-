"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { normalizePointOrderStatus } from "@/lib/mercadopago-point-status";

type SwitchPaymentButtonProps = {
  className?: string;
};

export function SwitchPaymentButton({ className }: SwitchPaymentButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [switching, setSwitching] = useState(false);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const getOrderStatus = async (orderId: string) => {
    const response = await fetch(`/api/mercadopago/order-status?orderId=${orderId}`, {
      cache: "no-store",
    });

    if (!response.ok) return "unknown";

    const data = await response.json().catch(() => null);
    return normalizePointOrderStatus(data?.status);
  };

  const tryCancelOrder = async (orderId: string) => {
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(`/api/mercadopago/cancel-order?orderId=${orderId}`, {
        method: "POST",
      });

      if (response.ok) {
        return { ok: true as const };
      }

      const data = await response.json().catch(() => null);
      const code =
        typeof data?.code === "string"
          ? data.code
          : typeof data?.details?.errors?.[0]?.code === "string"
            ? data.details.errors[0].code
            : "";

      const status = await getOrderStatus(orderId);

      if (status === "created" || status === "pending" || status === "processing") {
        await wait(500 * attempt);
        continue;
      }

      if (code === "cannot_cancel_order" || status === "at_terminal") {
        return {
          ok: false as const,
          message:
            "A Point ja recebeu a ordem no terminal. A API nao permite cancelar automaticamente nesse status. Aguarde finalizar/expirar no terminal e tente trocar novamente.",
        };
      }

      return {
        ok: false as const,
        message: data?.error || "Nao foi possivel cancelar o pedido",
      };
    }

    return {
      ok: false as const,
      message: "Nao foi possivel cancelar automaticamente. Tente novamente em alguns segundos.",
    };
  };

  const handleSwitchPayment = async () => {
    if (switching) return;

    setSwitching(true);

    try {
      const orderIdFromQuery = searchParams.get("orderId");
      const orderIdFromSession =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("activeOrderId")
          : null;
      const orderId = orderIdFromQuery || orderIdFromSession;

      if (orderId) {
        const cancelResult = await tryCancelOrder(orderId);
        if (!cancelResult.ok) {
          throw new Error(cancelResult.message);
        }
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("activeOrderId");
      }

      router.push("/checkout");
    } catch (error) {
      console.error("[switch-payment] cancel error:", error);
      alert(error instanceof Error ? error.message : "Erro ao cancelar pedido.");
      setSwitching(false);
    }
  };

  return (
    <div className={`fixed bottom-6 left-0 right-0 px-4 ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-md">
        <Button
          onClick={handleSwitchPayment}
          disabled={switching}
          className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
        >
          {switching ? "Cancelando..." : "Trocar forma de pagamento"}
        </Button>
      </div>
    </div>
  );
}
