import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { logger } from "@/api/utils/logger"

const EXTEND_EXPIRATION_MS = 3 * 60 * 1000

interface VerifyResetCodeInput {
  email: string | null
  code: string | null
}

export async function verifyResetCodeService(input: VerifyResetCodeInput) {
  try {
    if (!input.email || !input.code) {
      return { valid: false as const }
    }

    const repositories = getRepositoryFactory()
    const reset = await repositories.passwordReset.findValid(input.email, input.code, new Date().toISOString())

    if (!reset) {
      return { valid: false as const }
    }

    const newExpiresAt = new Date(Date.now() + EXTEND_EXPIRATION_MS)
    await repositories.passwordReset.extendExpiration(reset.id, newExpiresAt.toISOString())

    return { valid: true as const }
  } catch (error) {
    logger.error("verify-reset-code", error)
    return { valid: false as const }
  }
}

