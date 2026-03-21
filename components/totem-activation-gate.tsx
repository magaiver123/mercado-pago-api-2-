"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFullyDeviceId } from "@/lib/totem-device";

const ACTIVATION_PATH = "/totem/activation";
const MAINTENANCE_PATH = "/totem/maintenance";
const USERPROFILE_PREFIX = "/userprofile";
const POLLING_INTERVAL_MS = 15_000;

type GateReason =
  | "active"
  | "inactive"
  | "maintenance"
  | "not_found"
  | "missing_store"
  | "unknown"
  | null;

type GateState = {
  isLoading: boolean;
  allowed: boolean;
  hasDevice: boolean;
  reason: GateReason;
};

function getBlockedPath(reason: GateReason) {
  return reason === "maintenance" ? MAINTENANCE_PATH : ACTIVATION_PATH;
}

export function TotemActivationGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isUserprofileRoute = pathname.startsWith(USERPROFILE_PREFIX);

  const [state, setState] = useState<GateState>({
    isLoading: true,
    allowed: false,
    hasDevice: false,
    reason: null,
  });

  useEffect(() => {
    let isCancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function validateTotem() {
      if (isUserprofileRoute) {
        if (!isCancelled) {
          setState({
            isLoading: false,
            allowed: true,
            hasDevice: true,
            reason: null,
          });
        }
        return;
      }

      const deviceId = getFullyDeviceId();

      if (!deviceId) {
        try {
          const response = await fetch("/api/totem/admin-bypass/status", {
            method: "GET",
            cache: "no-store",
          });

          const data = await response.json().catch(() => null);
          const allowed = data?.allowed === true;

          if (!isCancelled) {
            setState({ isLoading: false, allowed, hasDevice: allowed, reason: null });
          }

          if (allowed && (pathname === ACTIVATION_PATH || pathname === MAINTENANCE_PATH)) {
            router.replace("/");
            return;
          }

          if (!allowed) {
            router.replace(USERPROFILE_PREFIX);
          }
        } catch {
          if (!isCancelled) {
            setState({ isLoading: false, allowed: false, hasDevice: false, reason: null });
          }

          router.replace(USERPROFILE_PREFIX);
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
            setState({
              isLoading: false,
              allowed: false,
              hasDevice: true,
              reason: "unknown",
            });
          }

          if (pathname !== ACTIVATION_PATH) {
            router.replace(ACTIVATION_PATH);
          }
          return;
        }

        const allowed = data?.allowed === true;
        const reason =
          typeof data?.reason === "string" ? (data.reason as GateReason) : null;
        const blockedPath = getBlockedPath(reason);

        if (!isCancelled) {
          setState({
            isLoading: false,
            allowed,
            hasDevice: true,
            reason: allowed ? null : reason ?? "unknown",
          });
        }

        if (allowed) {
          if (pathname === ACTIVATION_PATH || pathname === MAINTENANCE_PATH) {
            router.replace("/");
          }
          return;
        }

        if (pathname !== blockedPath) {
          router.replace(blockedPath);
        }
      } catch {
        if (!isCancelled) {
          setState({
            isLoading: false,
            allowed: false,
            hasDevice: true,
            reason: "unknown",
          });
        }
      }
    }

    validateTotem();

    if (!isUserprofileRoute) {
      intervalId = setInterval(() => {
        validateTotem();
      }, POLLING_INTERVAL_MS);
    }

    return () => {
      isCancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
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

  if (!state.allowed && pathname !== getBlockedPath(state.reason)) {
    return null;
  }

  if (
    state.allowed &&
    (pathname === ACTIVATION_PATH || pathname === MAINTENANCE_PATH)
  ) {
    return null;
  }

  return <>{children}</>;
}
