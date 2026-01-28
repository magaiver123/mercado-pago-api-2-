"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  ShoppingBag,
} from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import { getAuthUser } from "@/lib/auth-store";
import { createClient } from "@/lib/supabase/client";

type PaymentMethod = "credit_card" | "debit_card" | "pix";

export default function CheckoutPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();

  const total = getTotal();

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/tela-inicial");
    }
  }, [router]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-orange-500">
          <CardContent className="pt-6 text-center space-y-4">
            <ShoppingBag className="h-16 w-16 text-orange-400 mx-auto" />
            <h2 className="text-black text-xl font-semibold">Carrinho Vazio</h2>
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

      const response = await fetch("/api/mercadopago/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-totem-key": process.env.NEXT_PUBLIC_TOTEM_API_KEY!,
        },
        body: JSON.stringify({
          externalReference: `ORDER-${Date.now()}`,
          description: items
            .map((item) => `${item.quantity}x ${item.name}`)
            .join(", "),
          items: items.map((item) => ({
            productId: item.id, // ID REAL do produto no banco
            quantity: item.quantity,
          })),
          paymentMethodId: selectedMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setShowConflict(true);
          setError(data.error || "Já existe um pedido pendente no terminal");
          return;
        }
        throw new Error(data.error || "Erro ao criar pedido");
      }

      const supabase = createClient();
      await supabase.from("orders").insert({
        user_id: user.id,
        mercadopago_order_id: data.orderId,
        total_amount: total,
        payment_method: selectedMethod,
        status: "pending",
        items,
      });

      router.push(`/payment/processing?orderId=${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const paymentMethods = [
    { id: "credit_card", name: "Cartão de Crédito", icon: CreditCard },
    { id: "debit_card", name: "Cartão de Débito", icon: CreditCard },
    { id: "pix", name: "PIX", icon: DollarSign },
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-orange-500">
        <CardHeader>
          <CardTitle className="text-black text-2xl">
            Forma de Pagamento
          </CardTitle>
          <p className="text-black/60 mt-2">Selecione como deseja pagar</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-black">
            Valor total:{" "}
            <span className="font-bold text-xl ml-2">
              R$ {total.toFixed(2).replace(".", ",")}
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const active = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-6 rounded-lg border-2 transition ${
                    active
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-300 hover:border-orange-300"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 mb-2 ${
                      active ? "text-orange-500" : "text-black/60"
                    }`}
                  />
                  <p className="text-black font-semibold">{method.name}</p>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-4 bg-orange-100 text-orange-700 border border-orange-300 rounded">
              {error}
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Continuar
          </Button>

          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Menu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
