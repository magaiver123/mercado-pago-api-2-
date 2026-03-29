"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getDefaultStoreInfo, saveReceiptToSession } from "@/lib/receipt-types";
import { getCheckoutTaxDocument } from "@/lib/checkout-context";

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const checkoutSessionIdRef = useRef<string | null>(null);
  const router = useRouter();
  const { items, getTotal } = useCartStore();

  const total = getTotal();

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/");
    }
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
              onClick={() => router.push("/")}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Voltar ao Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateOrder = async () => {
    if (!selectedMethod) {
      setError("Por favor, selecione um método de pagamento");
      return;
    }

    const user = getAuthUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      setIsCreatingOrder(true);
      setError(null);
      setShowConflict(false);

      if (!checkoutSessionIdRef.current) {
        const startResponse = await fetch("/api/checkout/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const startData = await startResponse.json().catch(() => null);
        if (!startResponse.ok || typeof startData?.checkoutSessionId !== "string") {
          throw new Error("Nao foi possivel iniciar a sessao de checkout");
        }

        checkoutSessionIdRef.current = startData.checkoutSessionId;
      }

      const taxDocument = getCheckoutTaxDocument();
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
          paymentMethodId: selectedMethod,
          customerDocument: taxDocument?.value ?? null,
          customerDocumentType: taxDocument?.type ?? null,
        }),
      });

      const data = (await response.json()) as CreateOrderResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setShowConflict(true);
          setError(data.error || "Já existe um pedido pendente no terminal");
          return;
        }
        throw new Error(data.error || "Erro ao criar pedido");
      }

      const orderId = typeof data.orderId === "string" ? data.orderId : null;
      if (!orderId) {
        throw new Error("Resposta invalida ao criar pedido");
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
        customerDocument: taxDocument?.value ?? undefined,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        paymentMethod: getMethodName(selectedMethod),
        subtotal: total,
        total,
        storeName,
        storeAddress,
        storeLegalName,
        storeTaxId,
        storePhone,
        storeLogoPath,
      });

      router.push(`/payment/processing?orderId=${orderId}`);
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
      subtitle: "Faça o pagamento pelo seu App do Banco",
      icon: DollarSign,
    },
    {
      id: "debit_card",
      name: "Cartão de Débito",
      subtitle: undefined,
      icon: CreditCard,
    },
    {
      id: "credit_card",
      name: "Cartão de Crédito",
      subtitle: undefined,
      icon: CreditCard,
    },
  ] as const;

  const handleContinue = () => {
    if (!selectedMethod) {
      setError("Por favor, selecione um método de pagamento");
      return;
    }
    setShowConfirmation(true);
  };

  const handleBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
      setError(null);
      setShowConflict(false);
    } else {
      router.push("/");
    }
  };

  const getMethodName = (methodId: PaymentMethod) =>
    paymentMethods.find((m) => m.id === methodId)?.name || methodId;

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border border-orange-500">
          <CardHeader>
            <CardTitle className="text-black text-2xl">
              Confirmar Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border border-orange-200 rounded-lg p-6 space-y-4">
              <h3 className="text-black font-semibold text-lg">
                Resumo do Pedido
              </h3>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-orange-100 relative">
                    <Image
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-black font-medium">{item.name}</p>
                    <p className="text-black/60 text-sm">
                      {item.quantity}x R${" "}
                      {item.price.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <p className="text-black font-semibold">
                    R${" "}
                    {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center space-y-2">
              <p className="text-black/60">Método de Pagamento</p>
              <p className="text-black text-2xl font-bold">
                {getMethodName(selectedMethod!)}
              </p>
              <p className="text-black text-4xl font-bold mt-2">
                R$ {total.toFixed(2).replace(".", ",")}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-orange-100 text-orange-700 border border-orange-300 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateOrder}
              disabled={isCreatingOrder}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isCreatingOrder ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Confirmar e Enviar para Terminal
            </Button>

            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/LOGOMR.png"
            alt="Logo MR"
            width={112}
            height={112}
            priority
            className="mb-7 h-auto w-[112px]"
          />
          <h1 className="text-4xl font-black tracking-tight text-black">
            Como você quer pagar?
          </h1>
        </div>

        <div className="mb-6 rounded-3xl border border-orange-200 bg-orange-50/40 px-5 py-4 text-center">
          <p className="text-sm font-medium text-black/70">Valor total</p>
          <p className="mt-1 text-3xl font-black text-black">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const active = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full rounded-[2.25rem] border-2 px-6 py-5 text-left transition-all duration-200 ${
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
                    <Icon
                      className={`h-6 w-6 ${
                        active ? "text-white" : "text-orange-500"
                      }`}
                    />
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

        <div className="mt-7 space-y-3">
          <Button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600 disabled:bg-orange-300"
          >
            Continuar
          </Button>

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
