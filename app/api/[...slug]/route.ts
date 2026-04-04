import { NextResponse } from "next/server"
import { testOpenLockRoute } from "@/api/routes/lock-routes"
import {
  forgotPasswordRoute,
  loginByCpfRoute,
  loginByEmailRoute,
  logoutRoute,
  registerRoute,
  resetPasswordRoute,
  signupResendRoute,
  signupStartRoute,
  signupVerifyEmailRoute,
  signupVerifyPhoneRoute,
  verifyResetCodeRoute,
} from "@/api/routes/auth-routes"
import { getKioskSlidesRoute } from "@/api/routes/kiosk-routes"
import {
  adjustAdminFridgeInventoryRoute,
  createAdminFridgeRoute,
  createAdminLockRoute,
  getNextFridgeCodeRoute,
  inactivateAdminFridgeRoute,
  listAdminFridgeInventoryRoute,
  listAdminFridgesRoute,
  listAdminLockDiagnosticsRoute,
  listAdminLocksRoute,
  listOperationalFridgesRoute,
  setAdminFridgeInventoryMixRoute,
  testAdminLockOpenRoute,
  updateAdminFridgeRoute,
  updateAdminLockRoute,
} from "@/api/routes/fridge-routes"
import { getMenuBannerRoute, getMenuCategoriesRoute, getMenuProductsRoute } from "@/api/routes/menu-routes"
import { createMercadoPagoOrderRoute, cancelMercadoPagoOrderRoute, getMercadoPagoOrderStatusRoute, mercadopagoWebhookRoute, refundMercadoPagoOrderRoute } from "@/api/routes/mercadopago-routes"
import {
  registerOrderRoute,
  listUserOrdersRoute,
  reconcileProcessedOrdersRoute,
  sendOrderReceiptEmailRoute,
} from "@/api/routes/order-routes"
import {
  activatePrintAgentEnrollmentRoute,
  createPrintAgentEnrollmentRoute,
  createReceiptPrintJobRoute,
  createTestPrintJobRoute,
  getPrintGlobalSettingsRoute,
  listPrintAgentDevicesRoute,
  listGlobalPrinterStatusRoute,
  listRecentPrintJobsRoute,
  listTotemPrinterConfigsRoute,
  printAgentAckFailureRoute,
  printAgentAckSuccessRoute,
  printAgentClaimNextJobRoute,
  printAgentHeartbeatRoute,
  revokePrintAgentDeviceRoute,
  updatePrintGlobalSettingsRoute,
  upsertTotemPrinterConfigRoute,
} from "@/api/routes/print-routes"
import {
  confirmCheckoutSessionRoute,
  startCheckoutSessionRoute,
} from "@/api/routes/checkout-routes"
import {
  activateAdminBypassRoute,
  activateTotemRoute,
  adminBypassStatusRoute,
  deactivateAdminBypassRoute,
  totemStatusRoute,
} from "@/api/routes/totem-routes"
import { getUserProfileRoute, listPublicStoresRoute, updateUserProfileRoute } from "@/api/routes/userprofile-routes"
import { resendWebhookRoute } from "@/api/routes/email-routes"

export const dynamic = "force-dynamic"

type Handler = (request: Request) => Promise<NextResponse>

const routeTable: Record<string, Handler> = {
  "POST /api/locks/test-open": testOpenLockRoute,
  "GET /api/fridges/available": listOperationalFridgesRoute,
  "GET /api/admin/fridges": listAdminFridgesRoute,
  "GET /api/admin/fridges/next-code": getNextFridgeCodeRoute,
  "POST /api/admin/fridges": createAdminFridgeRoute,
  "PUT /api/admin/fridges": updateAdminFridgeRoute,
  "POST /api/admin/fridges/inactivate": inactivateAdminFridgeRoute,
  "GET /api/admin/locks": listAdminLocksRoute,
  "POST /api/admin/locks": createAdminLockRoute,
  "PUT /api/admin/locks": updateAdminLockRoute,
  "POST /api/admin/locks/test-open": testAdminLockOpenRoute,
  "GET /api/admin/locks/diagnostics": listAdminLockDiagnosticsRoute,
  "GET /api/admin/fridge-inventory": listAdminFridgeInventoryRoute,
  "POST /api/admin/fridge-inventory/mix": setAdminFridgeInventoryMixRoute,
  "POST /api/admin/fridge-inventory/adjust": adjustAdminFridgeInventoryRoute,
  "POST /api/auth/login": loginByCpfRoute,
  "POST /api/auth/logout": logoutRoute,
  "POST /api/auth/register": registerRoute,
  "GET /api/kiosk/slides": getKioskSlidesRoute,
  "GET /api/menu/banner": getMenuBannerRoute,
  "GET /api/menu/categories": getMenuCategoriesRoute,
  "GET /api/menu/products": getMenuProductsRoute,
  "POST /api/mercadopago/cancel-order": cancelMercadoPagoOrderRoute,
  "DELETE /api/mercadopago/cancel-order": cancelMercadoPagoOrderRoute,
  "POST /api/mercadopago/create-order": createMercadoPagoOrderRoute,
  "GET /api/mercadopago/order-status": getMercadoPagoOrderStatusRoute,
  "POST /api/mercadopago/refund-order": refundMercadoPagoOrderRoute,
  "POST /api/mercadopago/webhook": mercadopagoWebhookRoute,
  "POST /api/checkout/session/start": startCheckoutSessionRoute,
  "POST /api/checkout/session/confirm": confirmCheckoutSessionRoute,
  "POST /api/orders/register": registerOrderRoute,
  "POST /api/orders/reconcile-processed": reconcileProcessedOrdersRoute,
  "POST /api/userprofile/orders/send-receipt-email": sendOrderReceiptEmailRoute,
  "POST /api/resend/webhook": resendWebhookRoute,
  "POST /api/print/receipt": createReceiptPrintJobRoute,
  "GET /api/print/admin/totem-printers": listTotemPrinterConfigsRoute,
  "PUT /api/print/admin/totem-printers": upsertTotemPrinterConfigRoute,
  "POST /api/print/admin/test-print": createTestPrintJobRoute,
  "GET /api/print/admin/jobs": listRecentPrintJobsRoute,
  "GET /api/print/admin/global-settings": getPrintGlobalSettingsRoute,
  "PUT /api/print/admin/global-settings": updatePrintGlobalSettingsRoute,
  "GET /api/print/admin/global-status": listGlobalPrinterStatusRoute,
  "GET /api/print/admin/agent-devices": listPrintAgentDevicesRoute,
  "POST /api/print/agent/enrollment/create": createPrintAgentEnrollmentRoute,
  "POST /api/print/agent/enrollment/activate": activatePrintAgentEnrollmentRoute,
  "POST /api/print/agent/enrollment/revoke": revokePrintAgentDeviceRoute,
  "POST /api/print/agent/heartbeat": printAgentHeartbeatRoute,
  "POST /api/print/agent/claim-next-job": printAgentClaimNextJobRoute,
  "POST /api/print/agent/ack-success": printAgentAckSuccessRoute,
  "POST /api/print/agent/ack-failure": printAgentAckFailureRoute,
  "POST /api/totem/activate": activateTotemRoute,
  "POST /api/totem/status": totemStatusRoute,
  "POST /api/totem/admin-bypass/activate": activateAdminBypassRoute,
  "GET /api/totem/admin-bypass/status": adminBypassStatusRoute,
  "POST /api/totem/admin-bypass/deactivate": deactivateAdminBypassRoute,
  "POST /api/userprofile/auth/forgot-password": forgotPasswordRoute,
  "POST /api/userprofile/auth/login": loginByEmailRoute,
  "POST /api/userprofile/auth/reset-password": resetPasswordRoute,
  "POST /api/userprofile/auth/signup/resend": signupResendRoute,
  "POST /api/userprofile/auth/signup/start": signupStartRoute,
  "POST /api/userprofile/auth/signup/verify-email": signupVerifyEmailRoute,
  "POST /api/userprofile/auth/signup/verify-phone": signupVerifyPhoneRoute,
  "POST /api/userprofile/auth/verify-reset-code": verifyResetCodeRoute,
  "GET /api/userprofile/me": getUserProfileRoute,
  "GET /api/userprofile/stores": listPublicStoresRoute,
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
