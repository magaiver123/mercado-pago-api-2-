import { AppError } from "@/api/utils/app-error"
import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { isValidEmail, isValidUUID } from "@/api/utils/validators"
import { normalizePhone } from "@/api/utils/sanitize"

interface UpdateUserProfileInput {
  userId: string
  name: string
  email: string
  phone: string
}

export async function updateUserProfileService(input: UpdateUserProfileInput) {
  const userId = typeof input.userId === "string" ? input.userId.trim() : ""
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim() : ""
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : ""

  if (!userId || !isValidUUID(userId) || !name || !email || !isValidEmail(email) || phone.length < 10 || phone.length > 11) {
    throw new AppError("Dados invalidos", 400)
  }

  const repositories = getRepositoryFactory()
  const existingUser = await repositories.user.findById(userId)

  if (!existingUser || existingUser.status !== "ativo") {
    throw new AppError("Usuario nao encontrado", 404)
  }

  if (await repositories.user.existsByEmailExcludingId(email, userId)) {
    throw new AppError("Email ja cadastrado", 409)
  }

  const updatedUser = await repositories.user.updateProfile(userId, { name, email, phone })

  if (!updatedUser) {
    throw new AppError("Usuario nao encontrado", 404)
  }

  return {
    success: true,
    user: updatedUser,
  }
}

