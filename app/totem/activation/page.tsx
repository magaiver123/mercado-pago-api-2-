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
      setError("Informe o codigo de ativacao.");
      return;
    }

    if (!deviceId) {
      setError("Nao foi possivel identificar o dispositivo.");
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
        setError(data?.error || "Nao foi possivel ativar o totem.");
        return;
      }

      setSuccess("Totem ativado com sucesso. Redirecionando...");
      setActivationCode("");
      window.location.href = "/";
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingDevice) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
        <p className="text-zinc-700">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-zinc-200 shadow-lg bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-black">Ativar TOTEM</CardTitle>
          <p className="text-zinc-600 text-sm mt-2">
            Digite o codigo de ativacao para liberar este dispositivo.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleActivate} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="activation-code" className="text-black">
                Codigo de ativacao
              </Label>
              <Input
                id="activation-code"
                type="text"
                required
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                placeholder="Digite o codigo"
                disabled={!deviceId || isSubmitting}
                className="bg-white border-zinc-300 text-black focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {!deviceId && (
              <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">
                Dispositivo sem identificacao do Fully Browser Kiosk.
                Verifique se a JavaScript Interface esta habilitada.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
