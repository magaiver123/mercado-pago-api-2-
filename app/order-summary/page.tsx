"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderSummaryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/checkout");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <p className="text-sm font-medium text-black/70">Redirecionando para pagamento...</p>
    </div>
  );
}
