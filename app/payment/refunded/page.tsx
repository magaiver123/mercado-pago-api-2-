"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { clearAuthUser } from "@/lib/auth-store";
import { useEffect, useRef } from "react";

export default function RefundedPage() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      clearAuthUser();
      router.push("/");
    }, 10000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

  const handleReturn = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    clearAuthUser();
    router.push("/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-600">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <div className="bg-white/20 rounded-full p-6">
            <RotateCcw className="h-32 w-32 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white leading-tight">Pagamento reembolsado</h1>

          <p className="text-white/90 text-xl">
            O valor desta compra foi devolvido. Se precisar, faça um novo pedido.
          </p>
        </div>

        <Button
          onClick={handleReturn}
          size="lg"
          className="bg-white text-slate-700 hover:bg-white/90 mt-4 px-12 py-6 text-lg font-semibold"
        >
          Voltar ao Início
        </Button>
      </div>
    </main>
  );
}
