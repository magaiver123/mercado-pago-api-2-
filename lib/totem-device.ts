declare global {
  interface Window {
    fully?: {
      getDeviceId?: () => string;
    };
  }
}

export function getFullyDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const fully = window.fully;
  if (!fully || typeof fully.getDeviceId !== "function") {
    return null;
  }

  try {
    const rawDeviceId = fully.getDeviceId();
    if (typeof rawDeviceId !== "string") {
      return null;
    }

    const deviceId = rawDeviceId.trim();
    return deviceId.length > 0 ? deviceId : null;
  } catch {
    return null;
  }
}
