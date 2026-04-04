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
import { isValidUUID } from "@/api/utils/validators"

export async function startCheckoutSessionController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)
  const userSession = requireUserSessionFromRequest(request)

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const fridgeId = typeof body?.fridgeId === "string" ? body.fridgeId.trim() : ""
  if (!isValidUUID(fridgeId)) {
    return NextResponse.json({ error: "fridgeId invalido" }, { status: 400 })
  }

  const started = startCheckoutSessionService()
  const response = NextResponse.json(started)
  setCheckoutSessionCookie(response, {
    sessionId: started.checkoutSessionId,
    userId: userSession.userId,
    storeId: storeContext.storeId,
    fridgeId,
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
    return NextResponse.json({ error: "Sessao de checkout invalida" }, { status: 403 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await confirmCheckoutSessionService({
    body,
    storeId: storeContext.storeId,
    fridgeId: checkoutSession.fridgeId,
    userId: userSession.userId,
    checkoutSessionId: checkoutSession.sessionId,
  })

  const response = NextResponse.json(data)
  clearCheckoutSessionCookie(response)
  return response
}
