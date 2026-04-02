import { NextResponse } from "next/server"
import { listUserOrdersService } from "@/api/services/orders/list-user-orders-service"
import { registerOrderService } from "@/api/services/orders/register-order-service"
import { reconcileProcessedOrdersService } from "@/api/services/orders/reconcile-processed-orders-service"
import { sendOrderReceiptEmailService } from "@/api/services/orders/send-order-receipt-email-service"
import { getAdminBypassStatusService } from "@/api/services/totem/admin-bypass-service"
import { AppError } from "@/api/utils/app-error"
import { requireUserSessionFromRequest } from "@/api/utils/user-session-context"

function getAdminBypassErrorStatus(reason: string): number {
  if (reason === "disabled") return 403
  if (reason === "invalid_store") return 404
  return 401
}

export async function listUserOrdersController(request: Request) {
  const userSession = requireUserSessionFromRequest(request)

  const data = await listUserOrdersService(userSession.userId)
  return NextResponse.json(data)
}

export async function registerOrderController(request: Request) {
  const bypassStatus = await getAdminBypassStatusService(request)
  if (!bypassStatus.allowed || !bypassStatus.storeId) {
    return NextResponse.json(
      {
        error: "Acesso negado para registro manual de pedidos",
        reason: bypassStatus.reason,
      },
      { status: getAdminBypassErrorStatus(bypassStatus.reason) },
    )
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const data = await registerOrderService({
    storeId: bypassStatus.storeId,
    userId: body?.userId,
    mercadopagoOrderId: body?.mercadopagoOrderId,
    totalAmount: body?.totalAmount,
    paymentMethod: body?.paymentMethod,
    items: body?.items,
  })

  return NextResponse.json(data)
}

export async function reconcileProcessedOrdersController(request: Request) {
  const bypassStatus = await getAdminBypassStatusService(request)
  if (!bypassStatus.allowed || !bypassStatus.storeId) {
    return NextResponse.json(
      {
        error: "Acesso negado para reconciliação de pedidos",
        reason: bypassStatus.reason,
      },
      { status: getAdminBypassErrorStatus(bypassStatus.reason) },
    )
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {}

  const data = await reconcileProcessedOrdersService({
    storeId: bypassStatus.storeId,
    limit: body?.limit,
  })

  return NextResponse.json(data)
}

export async function sendOrderReceiptEmailController(request: Request) {
  const userSession = requireUserSessionFromRequest(request)
  if (userSession.source !== "userprofile") {
    throw new AppError(
      "Somente sessoes do UserProfile podem solicitar comprovante por e-mail",
      403,
      "USERPROFILE_SESSION_REQUIRED",
      true,
      false,
    )
  }

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await sendOrderReceiptEmailService({
    requesterUserId: userSession.userId,
    orderId: body?.orderId,
  })

  return NextResponse.json(data)
}
