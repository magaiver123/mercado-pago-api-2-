import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  forgotPasswordController,
  loginByCpfController,
  loginByEmailController,
  registerController,
  resetPasswordController,
  verifyResetCodeController,
} from "@/api/controllers/auth-controller"

export const loginByCpfRoute = withErrorHandler(loginByCpfController)
export const registerRoute = withErrorHandler(registerController)
export const loginByEmailRoute = withErrorHandler(loginByEmailController)
export const forgotPasswordRoute = withErrorHandler(forgotPasswordController)
export const verifyResetCodeRoute = withErrorHandler(verifyResetCodeController)
export const resetPasswordRoute = withErrorHandler(resetPasswordController)

