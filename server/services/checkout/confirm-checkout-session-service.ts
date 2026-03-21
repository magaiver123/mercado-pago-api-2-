import { createMercadoPagoOrderService } from "@/api/services/mercadopago/create-mercadopago-order-service"

interface ConfirmCheckoutSessionInput {
  body: unknown
  storeId: string
  userId: string
  checkoutSessionId: string
}

export async function confirmCheckoutSessionService(input: ConfirmCheckoutSessionInput) {
  const bodyWithSession = {
    ...(typeof input.body === "object" && input.body !== null ? input.body : {}),
    checkoutSessionId: input.checkoutSessionId,
  }

  return createMercadoPagoOrderService(bodyWithSession, input.storeId, input.userId)
}

