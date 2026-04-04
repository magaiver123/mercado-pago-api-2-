"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  DollarSign,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import { getAuthUser } from "@/lib/auth-store";
import { getSelectedFridge } from "@/lib/fridge-store";
import { getDefaultStoreInfo, saveReceiptToSession } from "@/lib/receipt-types";

type PaymentMethod = "credit_card" | "debit_card" | "pix";

type CreateOrderResponse = {
  orderId?: string;
  orderNumber?: number | null;
  error?: string;
};

export default function CheckoutPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutSessionIdRef = useRef<string | null>(null);
  const selectedFridgeIdRef = useRef<string | null>(null);
  const router = useRouter();
  const { items, getTotal } = useCartStore();

  const total = getTotal();

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/");
      return;
    }

    const fridge = getSelectedFridge();
    if (!fridge) {
      router.push("/fridge");
      return;
    }

    selectedFridgeIdRef.current = fridge.id;
  }, [router]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-orange-500">
          <CardContent className="pt-6 text-center space-y-4">
            <ShoppingBag className="h-16 w-16 text-orange-400 mx-auto" />
            <h2 className="text-black text-xl font-semibold">Sacola vazia</h2>
            <p className="text-black/70">
              Adicione produtos antes de finalizar o pedido
            </p>
            <Button
              onClick={() => router.push("/menu")}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Voltar ao Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateOrder = async (methodId: PaymentMethod) => {
    const user = getAuthUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!selectedFridgeIdRef.current) {
      router.push("/fridge");
      return;
    }

    try {
      setIsCreatingOrder(true);
      setSelectedMethod(methodId);
      setError(null);

      if (!checkoutSessionIdRef.current) {
        const startResponse = await fetch("/api/checkout/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fridgeId: selectedFridgeIdRef.current,
          }),
        });

        const startData = await startResponse.json().catch(() => null);
        if (!startResponse.ok || typeof startData?.checkoutSessionId !== "string") {
          throw new Error("Não foi possível iniciar a sessão de checkout");
        }

        checkoutSessionIdRef.current = startData.checkoutSessionId;
      }

      const response = await fetch("/api/checkout/session/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: items
            .map((item) => `${item.quantity}x ${item.name}`)
            .join(", "),
          items: items.map((item) => ({
            productId: item.id, // ID REAL do produto no banco
            quantity: item.quantity,
          })),
          paymentMethodId: methodId,
          fridgeId: selectedFridgeIdRef.current,
        }),
      });

      const data = (await response.json()) as CreateOrderResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setError(data.error || "J\u00E1 existe um pedido pendente no terminal");
          return;
        }
        throw new Error(data.error || "Erro ao criar pedido");
      }

      const orderId = typeof data.orderId === "string" ? data.orderId : null;
      if (!orderId) {
        throw new Error("Resposta inválida ao criar pedido");
      }

      const orderNumber =
        typeof data.orderNumber === "number" ? data.orderNumber : null;

      const {
        storeName,
        storeAddress,
        storeLegalName,
        storeTaxId,
        storePhone,
        storeLogoPath,
      } = getDefaultStoreInfo();
      const createdAtIso = new Date().toISOString();

      saveReceiptToSession({
        orderId,
        orderNumber,
        createdAt: createdAtIso,
        customerName: user.name,
        customerDocument: user.cpf,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        paymentMethod: getMethodName(methodId),
        subtotal: total,
        total,
        storeName,
        storeAddress,
        storeLegalName,
        storeTaxId,
        storePhone,
        storeLogoPath,
      });

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("activeOrderId", orderId);
      }

      router.push(`/payment/processing?orderId=${orderId}&method=${methodId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      checkoutSessionIdRef.current = null;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const paymentMethods = [
    {
      id: "pix",
      name: "PIX",
      subtitle: "Fa\u00E7a o pagamento pelo seu App do Banco",
      icon: DollarSign,
    },
    {
      id: "debit_card",
      name: "Cart\u00E3o de D\u00E9bito",
      subtitle: "Aproxime ou insira seu cart\u00E3o na m\u00E1quina",
      icon: CreditCard,
    },
    {
      id: "credit_card",
      name: "Cart\u00E3o de Cr\u00E9dito",
      subtitle: "Aproxime ou insira seu cart\u00E3o na m\u00E1quina",
      icon: CreditCard,
    },
  ] as const;

  const handleBack = () => {
    router.push("/menu");
  };

  const getMethodName = (methodId: PaymentMethod) =>
    paymentMethods.find((m) => m.id === methodId)?.name || methodId;

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logologin.png"
            alt="Logo MR"
            width={260}
            height={120}
            priority
            className="mb-7 h-auto w-[240px] sm:w-[260px]"
          />
          <h1 className="text-4xl font-black tracking-tight text-black">
            Como você quer pagar?
          </h1>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-black/70">Valor total</p>
          <p className="mt-1 text-3xl font-black text-black">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const active = selectedMethod === method.id;
            const loadingCurrentMethod = isCreatingOrder && selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => {
                  if (!isCreatingOrder) {
                    void handleCreateOrder(method.id);
                  }
                }}
                disabled={isCreatingOrder}
                className={`w-full rounded-[2.25rem] border-2 px-6 py-5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-80 ${
                  active
                    ? "border-orange-500 bg-orange-500 text-white shadow-[0_18px_35px_-22px_rgba(249,115,22,1)]"
                    : "border-orange-400 bg-white text-orange-600 hover:bg-orange-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-white/50 bg-white/15"
                        : "border-orange-200 bg-orange-100"
                    }`}
                  >
                    {loadingCurrentMethod ? (
                      <Spinner
                        className={`h-6 w-6 ${
                          active ? "text-white" : "text-orange-500"
                        }`}
                      />
                    ) : (
                      <Icon
                        className={`h-6 w-6 ${
                          active ? "text-white" : "text-orange-500"
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-2xl font-black leading-none ${
                        active ? "text-white" : "text-orange-600"
                      }`}
                    >
                      {method.name}
                    </p>
                    {method.subtitle ? (
                      <p
                        className={`mt-2 text-sm font-medium leading-snug ${
                          active ? "text-orange-50" : "text-black/70"
                        }`}
                      >
                        {method.subtitle}
                      </p>
                    ) : null}
                    {loadingCurrentMethod ? (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          active ? "text-orange-100" : "text-orange-600"
                        }`}
                      >
                        Iniciando pagamento...
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-orange-300 bg-orange-100 p-4 text-orange-700">
            {error}
          </div>
        )}

        <div className="mt-7">
          <Button
            onClick={handleBack}
            variant="outline"
            className="h-14 w-full rounded-full border-2 border-orange-500 text-base font-semibold text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
