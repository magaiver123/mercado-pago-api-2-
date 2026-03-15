import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  activateAdminBypassController,
  activateTotemController,
  adminBypassStatusController,
  deactivateAdminBypassController,
  totemStatusController,
} from "@/api/controllers/totem-controller"

export const activateTotemRoute = withErrorHandler(activateTotemController)
export const totemStatusRoute = withErrorHandler(totemStatusController)
export const activateAdminBypassRoute = withErrorHandler(activateAdminBypassController)
export const adminBypassStatusRoute = withErrorHandler(adminBypassStatusController)
export const deactivateAdminBypassRoute = withErrorHandler(deactivateAdminBypassController)
