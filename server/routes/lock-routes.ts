import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { testOpenLockController } from "@/api/controllers/lock-controller"

export const testOpenLockRoute = withErrorHandler(testOpenLockController)
