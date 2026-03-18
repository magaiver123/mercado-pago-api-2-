import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { logger } from "@/api/utils/logger"
import { sendResetCodeEmail } from "@/api/services/auth/send-reset-code-email"
import { isValidEmail } from "@/api/utils/validators"

const RESET_CODE_TTL_MS = 10 * 60 * 1000
const RESET_RESEND_COOLDOWN_MS = 60 * 1000
const GENERIC_COOLDOWN_SECONDS = Math.ceil(RESET_RESEND_COOLDOWN_MS / 1000)

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function genericForgotPasswordResponse() {
  return {
    success: true as const,
    cooldown: GENERIC_COOLDOWN_SECONDS,
  }
}

export async function forgotPasswordService(email: string | null) {
  const response = genericForgotPasswordResponse()

  try {
    const normalizedEmail = typeof email === "string" ? email.trim() : ""

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return response
    }

    const repositories = getRepositoryFactory()
    const user = await repositories.user.findByEmail(normalizedEmail)

    if (!user || user.status !== "ativo") {
      return response
    }

    const now = new Date()
    const latestReset = await repositories.passwordReset.findLatestByUserId(user.id)
    if (latestReset?.created_at) {
      const elapsedMs = now.getTime() - new Date(latestReset.created_at).getTime()
      if (!Number.isNaN(elapsedMs) && elapsedMs < RESET_RESEND_COOLDOWN_MS) {
        return response
      }
    }

    await repositories.passwordReset.expireAllActiveByUserId(user.id, now.toISOString())

    const code = generateCode()
    const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS)

    await repositories.passwordReset.create({
      userId: user.id,
      email: user.email,
      code,
      expiresAt: expiresAt.toISOString(),
    })

    await sendResetCodeEmail({
      email: user.email,
      code,
      recipientName: user.name,
      expiresInMinutes: Math.ceil(RESET_CODE_TTL_MS / 60_000),
    })

    return response
  } catch (error) {
    logger.error("forgot-password", error)
    return response
  }
}
