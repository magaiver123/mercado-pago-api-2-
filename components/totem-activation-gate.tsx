"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFullyDeviceId } from "@/lib/totem-device";

const ACTIVATION_PATH = "/totem/activation";
const USERPROFILE_PREFIX = "/userprofile";

type GateState = {
  isLoading: boolean;
  allowed: boolean;
  hasDevice: boolean;
};

export function TotemActivationGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isUserprofileRoute = pathname.startsWith(USERPROFILE_PREFIX);

  const [state, setState] = useState<GateState>({
    isLoading: true,
    allowed: false,
    hasDevice: false,
  });

  useEffect(() => {
    let isCancelled = false;

    async function validateTotem() {
      if (isUserprofileRoute) {
        if (!isCancelled) {
          setState({ isLoading: false, allowed: true, hasDevice: true });
        }
        return;
      }

      const deviceId = getFullyDeviceId();

      if (!deviceId) {
        if (!isCancelled) {
          setState({ isLoading: false, allowed: false, hasDevice: false });
        }

        router.replace(USERPROFILE_PREFIX);
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
            setState({ isLoading: false, allowed: false, hasDevice: true });
          }

          if (pathname !== ACTIVATION_PATH) {
            router.replace(ACTIVATION_PATH);
          }
          return;
        }

        const allowed = data?.allowed === true;

        if (!isCancelled) {
          setState({ isLoading: false, allowed, hasDevice: true });
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
          setState({ isLoading: false, allowed: false, hasDevice: true });
        }
      }
    }

    validateTotem();

    return () => {
      isCancelled = true;
    };
  }, [isUserprofileRoute, pathname, router]);

  if (isUserprofileRoute) {
    return <>{children}</>;
  }

  if (state.isLoading) {
    return null;
  }

  if (!state.hasDevice) {
    return null;
  }

  if (!state.allowed && pathname !== ACTIVATION_PATH) {
    return null;
  }

  if (state.allowed && pathname === ACTIVATION_PATH) {
    return null;
  }

  return <>{children}</>;
}
