"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFullyDeviceId } from "@/lib/totem-device";

const ACTIVATION_PATH = "/totem/activation";

type GateState = {
  isLoading: boolean;
  allowed: boolean;
};

export function TotemActivationGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [state, setState] = useState<GateState>({
    isLoading: true,
    allowed: false,
  });

  useEffect(() => {
    let isCancelled = false;

    async function validateTotem() {
      const deviceId = getFullyDeviceId();

      if (!deviceId) {
        if (!isCancelled) {
          setState({ isLoading: false, allowed: false });
        }

        if (pathname !== ACTIVATION_PATH) {
          router.replace(ACTIVATION_PATH);
        }
        return;
      }

      try {
        const response = await fetch("/api/totem/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (!isCancelled) {
            setState({ isLoading: false, allowed: false });
          }

          if (pathname !== ACTIVATION_PATH) {
            router.replace(ACTIVATION_PATH);
          }
          return;
        }

        const allowed = data?.allowed === true;

        if (!isCancelled) {
          setState({ isLoading: false, allowed });
        }

        if (allowed && pathname === ACTIVATION_PATH) {
          router.replace("/");
          return;
        }

        if (!allowed && pathname !== ACTIVATION_PATH) {
          router.replace(ACTIVATION_PATH);
        }
      } catch {
        if (!isCancelled) {
          setState({ isLoading: false, allowed: false });
        }

        if (pathname !== ACTIVATION_PATH) {
          router.replace(ACTIVATION_PATH);
        }
      }
    }

    validateTotem();

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  if (state.isLoading) {
    return (
      <div className="min-h-screen w-full bg-zinc-100 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-black text-lg font-semibold">Validando totem...</p>
          <p className="text-zinc-600 text-sm mt-2">Aguarde alguns segundos.</p>
        </div>
      </div>
    );
  }

  if (!state.allowed && pathname !== ACTIVATION_PATH) {
    return null;
  }

  if (state.allowed && pathname === ACTIVATION_PATH) {
    return null;
  }

  return <>{children}</>;
}
