import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  cancelMercadoPagoOrderController,
  createMercadoPagoOrderController,
  getMercadoPagoOrderStatusController,
  mercadopagoWebhookController,
  refundMercadoPagoOrderController,
} from "@/api/controllers/mercadopago-controller"

export const createMercadoPagoOrderRoute = withErrorHandler(createMercadoPagoOrderController)
export const cancelMercadoPagoOrderRoute = withErrorHandler(cancelMercadoPagoOrderController)
export const refundMercadoPagoOrderRoute = withErrorHandler(refundMercadoPagoOrderController)
export const getMercadoPagoOrderStatusRoute = withErrorHandler(getMercadoPagoOrderStatusController)
export const mercadopagoWebhookRoute = withErrorHandler(mercadopagoWebhookController)
