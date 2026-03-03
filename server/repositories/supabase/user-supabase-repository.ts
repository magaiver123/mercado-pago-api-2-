import { AppError } from "@/api/utils/app-error"
import { UserRecord } from "@/api/types/domain"
import { BaseSupabaseRepository } from "@/api/repositories/supabase/base-supabase-repository"
import { CreateUserInput, UpdateUserProfileInput, UserRepository } from "@/api/repositories/contracts/user-repository"

export class UserSupabaseRepository extends BaseSupabaseRepository implements UserRepository {
  async findActiveByCpf(cpf: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").eq("cpf", cpf).eq("status", "ativo").limit(1).maybeSingle()
    if (error) throw new AppError("Erro interno", 500)
    return (data as UserRecord | null) ?? null
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").eq("email", email).limit(1).maybeSingle()
    if (error) throw new AppError("Erro interno", 500)
    return (data as UserRecord | null) ?? null
  }

  async findById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").eq("id", userId).maybeSingle()
    if (error) throw new AppError("Erro ao buscar usuario", 500)
    return (data as UserRecord | null) ?? null
  }

  async findActiveById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await this.db.from("users").select("*").eq("id", userId).eq("status", "ativo").maybeSingle()
    if (error) throw new AppError("Erro ao buscar usuario", 500)
    return (data as UserRecord | null) ?? null
  }

  async existsByCpf(cpf: string): Promise<boolean> {
    const { data, error } = await this.db.from("users").select("id").eq("cpf", cpf).limit(1)
    if (error) throw new AppError("Erro interno", 500)
    return Boolean(data && data.length > 0)
  }

  async existsByEmail(email: string): Promise<boolean> {
    const { data, error } = await this.db.from("users").select("id").eq("email", email).limit(1)
    if (error) throw new AppError("Erro interno", 500)
    return Boolean(data && data.length > 0)
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const { data, error } = await this.db.from("users").select("id").eq("phone", phone).limit(1)
    if (error) throw new AppError("Erro interno", 500)
    return Boolean(data && data.length > 0)
  }

  async existsByEmailExcludingId(email: string, userId: string): Promise<boolean> {
    const { data, error } = await this.db.from("users").select("id").eq("email", email).neq("id", userId).limit(1)
    if (error) throw new AppError("Erro ao validar email", 500)
    return Boolean(data && data.length > 0)
  }

  async create(input: CreateUserInput): Promise<void> {
    const { error } = await this.db.from("users").insert({
      cpf: input.cpf,
      name: input.name,
      phone: input.phone,
      email: input.email,
      password_hash: input.passwordHash,
      status: input.status,
      created_at: input.createdAt,
    })

    if (error) throw new AppError("Erro ao cadastrar", 500)
  }

  async updateLastAccess(userId: string, isoDate: string): Promise<void> {
    await this.db.from("users").update({ last_access_at: isoDate }).eq("id", userId)
  }

  async updateProfile(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<Pick<UserRecord, "id" | "name" | "cpf" | "phone" | "email"> | null> {
    const { data, error } = await this.db
      .from("users")
      .update({
        name: input.name,
        email: input.email,
        phone: input.phone,
      })
      .eq("id", userId)
      .select("id, name, cpf, phone, email")
      .maybeSingle()

    if (error) {
      if (error.code === "23505") {
        throw new AppError("Email ja cadastrado", 409)
      }
      throw new AppError("Erro ao salvar alteracoes", 500)
    }

    return (data as Pick<UserRecord, "id" | "name" | "cpf" | "phone" | "email"> | null) ?? null
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.from("users").update({ password_hash: passwordHash }).eq("id", userId)
  }
}

