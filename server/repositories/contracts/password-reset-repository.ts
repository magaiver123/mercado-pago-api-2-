import { PasswordResetRecord } from "@/api/types/domain"

export interface CreatePasswordResetInput {
  userId: string
  email: string
  code: string
  expiresAt: string
}

export interface PasswordResetRepository {
  expireAllActiveByUserId(userId: string, usedAt: string): Promise<void>
  create(input: CreatePasswordResetInput): Promise<void>
  findValid(email: string, code: string, now: string): Promise<PasswordResetRecord | null>
  extendExpiration(resetId: string, expiresAt: string): Promise<void>
  markUsed(resetId: string, usedAt: string): Promise<void>
}

