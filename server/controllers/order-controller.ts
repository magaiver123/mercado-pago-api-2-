import { NextResponse } from "next/server"
import { listUserOrdersService } from "@/api/services/orders/list-user-orders-service"
import { registerOrderService } from "@/api/services/orders/register-order-service"
import { requireStoreContextFromRequest } from "@/api/utils/store-context"

export async function listUserOrdersController(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  const data = await listUserOrdersService(userId)
  return NextResponse.json(data)
}

export async function registerOrderController(request: Request) {
  const storeContext = requireStoreContextFromRequest(request)

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
  }

  const data = await registerOrderService({
    storeId: storeContext.storeId,
    userId: body?.userId,
    mercadopagoOrderId: body?.mercadopagoOrderId,
    totalAmount: body?.totalAmount,
    paymentMethod: body?.paymentMethod,
    items: body?.items,
  })

  return NextResponse.json(data)
}
