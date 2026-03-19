import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import { getUserProfileController, listPublicStoresController, updateUserProfileController } from "@/api/controllers/userprofile-controller"

export const getUserProfileRoute = withErrorHandler(getUserProfileController)
export const listPublicStoresRoute = withErrorHandler(listPublicStoresController)
export const updateUserProfileRoute = withErrorHandler(updateUserProfileController)
