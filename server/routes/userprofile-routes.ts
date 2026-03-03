import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { getUserProfileController, updateUserProfileController } from "@/api/controllers/userprofile-controller"

export const getUserProfileRoute = withErrorHandler(getUserProfileController)
export const updateUserProfileRoute = withErrorHandler(updateUserProfileController)

