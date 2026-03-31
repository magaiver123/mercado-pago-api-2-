import { AppError } from "@/api/utils/app-error"
import { SignupVerificationRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import {
  CreateSignupVerificationInput,
  SignupVerificationRepository,
} from "@/api/repositories/contracts/signup-verification-repository"

export class SignupVerificationSupabaseRepository
  extends BaseSupabaseRepository
  implements SignupVerificationRepository
{
  async create(input: CreateSignupVerificationInput): Promise<SignupVerificationRecord> {
    const { data, error } = await this.db
      .from("signup_verifications")
      .insert({
        name: input.name,
        cpf: input.cpf,
        phone: input.phone,
        email: input.email,
        password_hash: input.passwordHash,
        email_code: input.emailCode,
        phone_code: input.phoneCode,
        email_code_expires_at: input.emailCodeExpiresAt,
        phone_code_expires_at: input.phoneCodeExpiresAt,
        last_email_sent_at: input.lastEmailSentAt,
        last_phone_sent_at: input.lastPhoneSentAt,
        expires_at: input.expiresAt,
      })
      .select("*")
      .single()

    if (error) throw new AppError("Erro ao iniciar cadastro", 500)

    return data as SignupVerificationRecord
  }

  async findById(signupId: string): Promise<SignupVerificationRecord | null> {
    const { data, error } = await this.db
      .from("signup_verifications")
      .select("*")
      .eq("id", signupId)
      .maybeSingle()

    if (error) throw new AppError("Erro ao buscar verificação de cadastro", 500)

    return (data as SignupVerificationRecord | null) ?? null
  }

  async updateEmailCode(signupId: string, code: string, codeExpiresAt: string, sentAt: string): Promise<void> {
    const { error } = await this.db
      .from("signup_verifications")
      .update({
        email_code: code,
        email_code_expires_at: codeExpiresAt,
        last_email_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", signupId)

    if (error) throw new AppError("Erro ao atualizar código de email", 500)
  }

  async updatePhoneCode(signupId: string, code: string, codeExpiresAt: string, sentAt: string): Promise<void> {
    const { error } = await this.db
      .from("signup_verifications")
      .update({
        phone_code: code,
        phone_code_expires_at: codeExpiresAt,
        last_phone_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", signupId)

    if (error) throw new AppError("Erro ao atualizar código de telefone", 500)
  }

  async markEmailVerified(signupId: string, verifiedAt: string): Promise<void> {
    const { error } = await this.db
      .from("signup_verifications")
      .update({
        email_verified_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("id", signupId)

    if (error) throw new AppError("Erro ao validar email", 500)
  }

  async markPhoneVerified(signupId: string, verifiedAt: string): Promise<void> {
    const { error } = await this.db
      .from("signup_verifications")
      .update({
        phone_verified_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("id", signupId)

    if (error) throw new AppError("Erro ao validar telefone", 500)
  }

  async markCompleted(signupId: string, completedAt: string): Promise<void> {
    const { error } = await this.db
      .from("signup_verifications")
      .update({
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", signupId)

    if (error) throw new AppError("Erro ao finalizar cadastro", 500)
  }
}
