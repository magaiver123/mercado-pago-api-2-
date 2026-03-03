import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { getKioskSlidesController } from "@/api/controllers/kiosk-controller"

export const getKioskSlidesRoute = withErrorHandler(getKioskSlidesController)

