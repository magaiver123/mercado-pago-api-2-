import { getRepositoryFactory } from "@/api/repositories/repository-factory"
import { logger } from "@/api/utils/logger"
import { sendResetCodeEmail } from "@/api/services/auth/send-reset-code-email"

const CODE_EXPIRATION_MS = 60_000

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function forgotPasswordService(email: string | null) {
  try {
    if (!email || typeof email !== "string") {
      return { success: false as const }
    }

    const repositories = getRepositoryFactory()
    const user = await repositories.user.findByEmail(email)

    if (!user || user.status !== "ativo") {
      return { success: false as const }
    }

    const now = new Date()
    await repositories.passwordReset.expireAllActiveByUserId(user.id, now.toISOString())

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS)

    await repositories.passwordReset.create({
      userId: user.id,
      email: user.email,
      code,
      expiresAt: expiresAt.toISOString(),
    })

    // Mantem comportamento atual (destinatario fixo)
    await sendResetCodeEmail("mrstoreoficial051@gmail.com", code)

    return {
      success: true as const,
      cooldown: Math.ceil(CODE_EXPIRATION_MS / 1000),
    }
  } catch (error) {
    logger.error("forgot-password", error)
    return { success: false as const }
  }
}

