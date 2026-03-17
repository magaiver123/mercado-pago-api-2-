import { withErrorHandler } from "@/api/middlewares/with-error-handler"
import {
  forgotPasswordController,
  loginByCpfController,
  loginByEmailController,
  registerController,
  resetPasswordController,
  signupResendController,
  signupStartController,
  signupVerifyEmailController,
  signupVerifyPhoneController,
  verifyResetCodeController,
} from "@/api/controllers/auth-controller"

export const loginByCpfRoute = withErrorHandler(loginByCpfController)
export const registerRoute = withErrorHandler(registerController)
export const loginByEmailRoute = withErrorHandler(loginByEmailController)
export const forgotPasswordRoute = withErrorHandler(forgotPasswordController)
export const verifyResetCodeRoute = withErrorHandler(verifyResetCodeController)
export const resetPasswordRoute = withErrorHandler(resetPasswordController)
export const signupStartRoute = withErrorHandler(signupStartController)
export const signupVerifyEmailRoute = withErrorHandler(signupVerifyEmailController)
export const signupResendRoute = withErrorHandler(signupResendController)
export const signupVerifyPhoneRoute = withErrorHandler(signupVerifyPhoneController)
