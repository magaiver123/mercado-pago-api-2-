import { SignupVerificationRecord } from "@/api/types/domain"

export type SignupVerificationChannel = "email" | "phone"

export interface CreateSignupVerificationInput {
  name: string
  cpf: string
  phone: string
  email: string
  passwordHash: string
  emailCode: string
  phoneCode: string
  emailCodeExpiresAt: string
  phoneCodeExpiresAt: string
  lastEmailSentAt: string
  lastPhoneSentAt: string
  expiresAt: string
}

export interface SignupVerificationRepository {
  create(input: CreateSignupVerificationInput): Promise<SignupVerificationRecord>
  findById(signupId: string): Promise<SignupVerificationRecord | null>
  updateEmailCode(signupId: string, code: string, codeExpiresAt: string, sentAt: string): Promise<void>
  updatePhoneCode(signupId: string, code: string, codeExpiresAt: string, sentAt: string): Promise<void>
  markEmailVerified(signupId: string, verifiedAt: string): Promise<void>
  markPhoneVerified(signupId: string, verifiedAt: string): Promise<void>
  markCompleted(signupId: string, completedAt: string): Promise<void>
}
