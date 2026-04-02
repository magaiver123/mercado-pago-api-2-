import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  listUserOrdersController,
  reconcileProcessedOrdersController,
  registerOrderController,
  sendOrderReceiptEmailController,
} from "@/api/controllers/order-controller"

export const listUserOrdersRoute = withErrorHandler(listUserOrdersController)
export const registerOrderRoute = withErrorHandler(registerOrderController)
export const reconcileProcessedOrdersRoute = withErrorHandler(reconcileProcessedOrdersController)
export const sendOrderReceiptEmailRoute = withErrorHandler(sendOrderReceiptEmailController)
