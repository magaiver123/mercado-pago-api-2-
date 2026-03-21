import { randomUUID } from "crypto"

export function startCheckoutSessionService() {
  return {
    checkoutSessionId: `chk_${randomUUID()}`,
    issuedAt: new Date().toISOString(),
  }
}

