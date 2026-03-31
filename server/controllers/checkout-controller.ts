import { NextResponse } from "next/server"
import { confirmCheckoutSessionService } from "@/api/services/checkout/confirm-checkout-session-service"
import { startCheckoutSessionService } from "@/api/services/checkout/start-checkout-session-service"
import {
  clearCheckoutSessionCookie,
  requireCheckoutSessionFromRequest,
  setCheckoutSessionCookie,
} from "@/api/utils/checkout-session-context"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"
import { requireUserSessionFromRequest } from "@/api/utils/user-session-context"

export async function startCheckoutSessionController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const userSession = requireUserSessionFromRequest(request)

  const started = startCheckoutSessionService()
  const response = NextResponse.json(started)
  setCheckoutSessionCookie(response, {
    sessionId: started.checkoutSessionId,
    userId: userSession.userId,
    storeId: storeContext.storeId,
  })
  return response
}

export async function confirmCheckoutSessionController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const userSession = requireUserSessionFromRequest(request)
  const checkoutSession = requireCheckoutSessionFromRequest(request)

  if (
    checkoutSession.userId !== userSession.userId ||
    checkoutSession.storeId !== storeContext.storeId
  ) {
    return NextResponse.json({ error: "Sessão de checkout inválida" }, { status: 403 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const data = await confirmCheckoutSessionService({
    body,
    storeId: storeContext.storeId,
    userId: userSession.userId,
    checkoutSessionId: checkoutSession.sessionId,
  })

  const response = NextResponse.json(data)
  clearCheckoutSessionCookie(response)
  return response
}

