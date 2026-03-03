import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { listUserOrdersController, registerOrderController } from "@/api/controllers/order-controller"

export const listUserOrdersRoute = withErrorHandler(listUserOrdersController)
export const registerOrderRoute = withErrorHandler(registerOrderController)

