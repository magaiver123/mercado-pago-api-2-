"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type SwitchPaymentButtonProps = {
  className?: string;
};

export function SwitchPaymentButton({ className }: SwitchPaymentButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [switching, setSwitching] = useState(false);

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
        const response = await fetch(`/api/mercadopago/cancel-order?orderId=${orderId}`, {
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
