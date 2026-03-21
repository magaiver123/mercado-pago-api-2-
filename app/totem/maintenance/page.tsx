"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TotemMaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <Card className="w-full max-w-md border border-zinc-200 bg-white shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-black">Totem em Manutencao</CardTitle>
          <p className="mt-2 text-sm text-zinc-600">
            Totem em manutencao. Voltaremos em instantes.
          </p>
        </CardHeader>

        <CardContent>
          <p className="text-center text-sm text-zinc-500">
            Aguarde alguns instantes. Esta tela sera atualizada automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
