import { AppError } from "@/api/utils/app-error"
import { PasswordResetRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { CreatePasswordResetInput, PasswordResetRepository } from "@/api/repositories/contracts/password-reset-repository"

export class PasswordResetSupabaseRepository extends BaseSupabaseRepository implements PasswordResetRepository {
  async expireAllActiveByUserId(userId: string, usedAt: string): Promise<void> {
    await this.db.from("password_resets").update({ used_at: usedAt }).eq("user_id", userId).is("used_at", null)
  }

  async create(input: CreatePasswordResetInput): Promise<void> {
    const { error } = await this.db.from("password_resets").insert({
      user_id: input.userId,
      email: input.email,
      code: input.code,
      expires_at: input.expiresAt,
    })

    if (error) throw new AppError("Erro ao criar reset", 500)
  }

  async findValid(email: string, code: string, now: string): Promise<PasswordResetRecord | null> {
    const { data, error } = await this.db
      .from("password_resets")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new AppError("Erro ao validar codigo", 500)
    return (data as PasswordResetRecord | null) ?? null
  }

  async extendExpiration(resetId: string, expiresAt: string): Promise<void> {
    await this.db.from("password_resets").update({ expires_at: expiresAt }).eq("id", resetId)
  }

  async markUsed(resetId: string, usedAt: string): Promise<void> {
    await this.db.from("password_resets").update({ used_at: usedAt }).eq("id", resetId)
  }
}

