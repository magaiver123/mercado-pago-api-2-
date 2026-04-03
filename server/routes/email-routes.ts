import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { resendWebhookController } from "@/api/controllers/email-controller"

export const resendWebhookRoute = withErrorHandler(resendWebhookController)

