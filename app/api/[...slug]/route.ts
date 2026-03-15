import { NextResponse } from "next/server"
import { loginByCpfRoute, registerRoute, loginByEmailRoute, forgotPasswordRoute, resetPasswordRoute, verifyResetCodeRoute } from "@/api/routes/auth-routes"
import { getKioskSlidesRoute } from "@/api/routes/kiosk-routes"
import { getMenuCategoriesRoute, getMenuProductsRoute } from "@/api/routes/menu-routes"
import { createMercadoPagoOrderRoute, cancelMercadoPagoOrderRoute, getMercadoPagoOrderStatusRoute, mercadopagoWebhookRoute, refundMercadoPagoOrderRoute } from "@/api/routes/mercadopago-routes"
import { registerOrderRoute, listUserOrdersRoute } from "@/api/routes/order-routes"
import {
  activateAdminBypassRoute,
  activateTotemRoute,
  adminBypassStatusRoute,
  deactivateAdminBypassRoute,
  totemStatusRoute,
} from "@/api/routes/totem-routes"
import { getUserProfileRoute, updateUserProfileRoute } from "@/api/routes/userprofile-routes"

export const dynamic = "force-dynamic"

type Handler = (request: Request) => Promise<NextResponse>

const routeTable: Record<string, Handler> = {
  "POST /api/auth/login": loginByCpfRoute,
  "POST /api/auth/register": registerRoute,
  "GET /api/kiosk/slides": getKioskSlidesRoute,
  "GET /api/menu/categories": getMenuCategoriesRoute,
  "GET /api/menu/products": getMenuProductsRoute,
  "POST /api/mercadopago/cancel-order": cancelMercadoPagoOrderRoute,
  "DELETE /api/mercadopago/cancel-order": cancelMercadoPagoOrderRoute,
  "POST /api/mercadopago/create-order": createMercadoPagoOrderRoute,
  "GET /api/mercadopago/order-status": getMercadoPagoOrderStatusRoute,
  "POST /api/mercadopago/refund-order": refundMercadoPagoOrderRoute,
  "POST /api/mercadopago/webhook": mercadopagoWebhookRoute,
  "POST /api/orders/register": registerOrderRoute,
  "POST /api/totem/activate": activateTotemRoute,
  "POST /api/totem/status": totemStatusRoute,
  "POST /api/totem/admin-bypass/activate": activateAdminBypassRoute,
  "GET /api/totem/admin-bypass/status": adminBypassStatusRoute,
  "POST /api/totem/admin-bypass/deactivate": deactivateAdminBypassRoute,
  "POST /api/userprofile/auth/forgot-password": forgotPasswordRoute,
  "POST /api/userprofile/auth/login": loginByEmailRoute,
  "POST /api/userprofile/auth/reset-password": resetPasswordRoute,
  "POST /api/userprofile/auth/verify-reset-code": verifyResetCodeRoute,
  "GET /api/userprofile/me": getUserProfileRoute,
  "PUT /api/userprofile/me": updateUserProfileRoute,
  "GET /api/userprofile/orders": listUserOrdersRoute,
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function resolveHandler(request: Request): Handler | null {
  const url = new URL(request.url)
  const key = `${request.method.toUpperCase()} ${normalizePath(url.pathname)}`
  return routeTable[key] ?? null
}

async function dispatch(request: Request) {
  const handler = resolveHandler(request)
  if (!handler) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 })
  }

  return handler(request)
}

export async function GET(request: Request) {
  return dispatch(request)
}

export async function POST(request: Request) {
  return dispatch(request)
}

export async function PUT(request: Request) {
  return dispatch(request)
}

export async function DELETE(request: Request) {
  return dispatch(request)
}
