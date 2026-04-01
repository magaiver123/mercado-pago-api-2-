"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCartStore } from "@/lib/cart-store";
import { getAuthUser } from "@/lib/auth-store";
import { ShoppingBag } from "lucide-react";
import {
  getCheckoutTaxDocument,
  saveCheckoutTaxDocument,
} from "@/lib/checkout-context";

type TaxIdType = "CPF" | "CNPJ";

const TAX_ID_DIGIT_LENGTH: Record<TaxIdType, number> = {
  CPF: 11,
  CNPJ: 14,
};

function normalizeTaxId(value: string, type: TaxIdType) {
  return value.replace(/\D/g, "").slice(0, TAX_ID_DIGIT_LENGTH[type]);
}

function formatTaxId(value: string, type: TaxIdType) {
  const digits = normalizeTaxId(value, type);

  if (type === "CPF") {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function OrderSummaryPage() {
  const router = useRouter();
  const { items, getTotal } = useCartStore();

  const [taxIdType, setTaxIdType] = useState<TaxIdType>("CPF");
  const [taxIdValue, setTaxIdValue] = useState("");
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxError, setTaxError] = useState<string | null>(null);

  const total = getTotal();
  const subtotal = total;

  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const saved = getCheckoutTaxDocument();
    if (saved) {
      setTaxIdType(saved.type);
      setTaxIdValue(normalizeTaxId(saved.value, saved.type));
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-orange-500">
          <CardContent className="pt-6 text-center space-y-4">
            <ShoppingBag className="h-16 w-16 text-orange-400 mx-auto" />
            <h2 className="text-black text-xl font-semibold">Sacola vazia</h2>
            <p className="text-black/70">
              Adicione produtos antes de visualizar o resumo do pedido
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

  const formattedSubtotal = subtotal.toFixed(2).replace(".", ",");
  const formattedTotal = total.toFixed(2).replace(".", ",");
  const formattedTaxIdValue = formatTaxId(taxIdValue, taxIdType);

  const handleTaxIdTypeChange = (nextType: TaxIdType) => {
    setTaxIdType(nextType);
    setTaxError(null);
    setTaxIdValue((previous) => normalizeTaxId(previous, nextType));
  };

  const handleGoToPayment = () => {
    const normalized = normalizeTaxId(taxIdValue, taxIdType);

    if (normalized.length === 0) {
      saveCheckoutTaxDocument(null);
      router.push("/checkout");
      return;
    }

    const expectedLength = TAX_ID_DIGIT_LENGTH[taxIdType];
    if (normalized.length !== expectedLength) {
      setTaxError(`${taxIdType} inválido. Confira os números informados.`);
      return;
    }

    saveCheckoutTaxDocument({
      type: taxIdType,
      value: normalized,
    });
    router.push("/checkout");
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-28">
        <div className="w-full max-w-2xl flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={96}
              height={96}
              className="h-20 w-20 object-contain"
            />
            <h1 className="text-black text-3xl font-bold text-center">
              Resumo do pedido
            </h1>
          </div>

          <section className="w-full max-w-2xl mt-4">
            <div className="flex items-center justify-between gap-4 border border-orange-200 rounded-xl px-4 py-3 bg-orange-50/60">
              <div className="flex flex-col">
                <span className="text-black font-semibold">
                  Deseja CPF/CNPJ na nota?
                </span>
                {taxIdValue && (
                  <span className="text-sm text-black/70 mt-1">
                    {taxIdType}: <span className="font-semibold">{formattedTaxIdValue}</span>
                  </span>
                )}
              </div>
              <Button
                variant="link"
                className="text-orange-500 font-bold underline underline-offset-4"
                onClick={() => {
                  setTaxError(null);
                  setIsTaxModalOpen(true);
                }}
              >
                {taxIdValue ? "Editar" : "Adicionar"}
              </Button>
            </div>
            {taxError && (
              <p className="mt-2 text-sm font-medium text-red-600">{taxError}</p>
            )}
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-orange-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-6 px-4 py-4">
          <div className="flex flex-col">
            <span className="text-black/70 text-sm">Subtotal</span>
            <span className="text-black font-semibold text-lg">
              R$ {formattedSubtotal}
            </span>
            <span className="text-black/70 text-sm mt-2">Total</span>
            <span className="text-black font-bold text-2xl">
              R$ {formattedTotal}
            </span>
          </div>

          <div className="flex flex-1 flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              Voltar
            </Button>
            <Button
              onClick={handleGoToPayment}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
            >
              Ir para pagamento
            </Button>
          </div>
        </div>
      </footer>

      <Dialog open={isTaxModalOpen} onOpenChange={setIsTaxModalOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>CPF/CNPJ na nota</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={taxIdType === "CPF" ? "default" : "outline"}
                className={
                  taxIdType === "CPF"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "border-orange-300 text-orange-700 hover:bg-orange-50"
                }
                onClick={() => handleTaxIdTypeChange("CPF")}
              >
                CPF
              </Button>
              <Button
                type="button"
                variant={taxIdType === "CNPJ" ? "default" : "outline"}
                className={
                  taxIdType === "CNPJ"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "border-orange-300 text-orange-700 hover:bg-orange-50"
                }
                onClick={() => handleTaxIdTypeChange("CNPJ")}
              >
                CNPJ
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                {taxIdType}
              </label>
              <input
                type="text"
                value={formattedTaxIdValue}
                onChange={(event) => {
                  const numeric = normalizeTaxId(event.target.value, taxIdType);
                  setTaxError(null);
                  setTaxIdValue(numeric);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={taxIdType === "CPF" ? 14 : 18}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1"
                placeholder={
                  taxIdType === "CPF"
                    ? "000.000.000-00"
                    : "00.000.000/0000-00"
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-orange-200 text-black hover:bg-orange-50"
                onClick={() => setIsTaxModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  const normalized = normalizeTaxId(taxIdValue, taxIdType);
                  const expectedLength = TAX_ID_DIGIT_LENGTH[taxIdType];

                  if (normalized.length > 0 && normalized.length !== expectedLength) {
                    setTaxError(`${taxIdType} inválido. Confira os números informados.`);
                    return;
                  }

                  setTaxError(null);
                  setTaxIdValue(normalized);
                  setIsTaxModalOpen(false);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

