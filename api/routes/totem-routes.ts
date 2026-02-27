import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { activateTotemController, totemStatusController } from "@/api/controllers/totem-controller"

export const activateTotemRoute = withErrorHandler(activateTotemController)
export const totemStatusRoute = withErrorHandler(totemStatusController)

