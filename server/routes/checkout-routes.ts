import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  confirmCheckoutSessionController,
  startCheckoutSessionController,
} from "@/api/controllers/checkout-controller"

export const startCheckoutSessionRoute = withErrorHandler(startCheckoutSessionController)
export const confirmCheckoutSessionRoute = withErrorHandler(confirmCheckoutSessionController)

