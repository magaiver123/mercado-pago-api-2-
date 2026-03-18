import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { AppError } from "@/api/utils/app-error"
import { isValidUUID } from "@/api/utils/validators"

interface SignupVerifyPhoneInput {
  signupId: string
  code: string
}

export async function signupVerifyPhoneService(input: SignupVerifyPhoneInput) {
  const signupId = typeof input.signupId === "string" ? input.signupId.trim() : ""
  if (!isValidUUID(signupId)) {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()
  const signup = await repositories.signupVerification.findById(signupId)

  if (!signup) {
    throw new AppError("Verificacao de cadastro nao encontrada", 404)
  }

  if (signup.completed_at) {
    return { success: true as const }
  }

  throw new AppError("Verificacao por telefone nao e mais necessaria. Conclua pelo codigo de e-mail.", 410)
}
