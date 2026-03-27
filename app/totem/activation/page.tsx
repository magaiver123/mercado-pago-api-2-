"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFullyDeviceId } from "@/lib/totem-device";

export default function TotemActivationPage() {
  const [activationCode, setActivationCode] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fullyDeviceId = getFullyDeviceId();
    setDeviceId(fullyDeviceId);
    setIsCheckingDevice(false);
  }, []);

  const handleActivate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedCode = activationCode.trim();

    if (!trimmedCode) {
      setError("Digite o código de ativação.");
      return;
    }

    if (!deviceId) {
      setError("Não foi possível identificar este dispositivo.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/totem/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activationCode: trimmedCode,
          deviceId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.error ||
            "Não foi possível ativar o TOTEM. Confira o código e tente novamente.",
        );
        return;
      }

      setSuccess("TOTEM ativado com sucesso. Redirecionando...");
      setActivationCode("");
      window.location.href = "/";
    } catch {
      setError("Sem conexão com a internet. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingDevice) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
        <p className="text-zinc-700">Verificando dispositivo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-zinc-200 shadow-lg bg-white">
        <CardHeader className="space-y-2 pb-2 text-center">
          <CardTitle className="text-[2rem] font-semibold tracking-tight text-black">
            Ativar TOTEM
          </CardTitle>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-600">
            Informe o código de ativação para liberar este dispositivo.
          </p>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleActivate} className="space-y-6">
            <div className="grid gap-2.5">
              <Label
                htmlFor="activation-code"
                className="text-sm font-medium text-black"
              >
                Código de ativação
              </Label>
              <Input
                id="activation-code"
                type="text"
                required
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                placeholder="Digite o código de ativação"
                disabled={!deviceId || isSubmitting}
                className="h-11 border-zinc-300 bg-white text-black focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {!deviceId && (
              <div className="rounded-md border border-orange-300 bg-orange-50 p-3.5 text-sm leading-relaxed text-orange-700">
                Dispositivo não identificado no Fully Browser Kiosk. Verifique
                se a JavaScript Interface está ativada.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3.5 text-sm leading-relaxed text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-300 bg-green-50 p-3.5 text-sm leading-relaxed text-green-700">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-orange-500 text-base font-medium text-white hover:bg-orange-600"
              disabled={!deviceId || isSubmitting}
            >
              {isSubmitting ? "Ativando..." : "Ativar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
