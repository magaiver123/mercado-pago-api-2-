import { UserRecord } from "@/api/types/domain"

export interface CreateUserInput {
  cpf: string
  name: string
  phone: string
  email: string
  passwordHash: string
  status: string
  createdAt: string
}

export interface UpdateUserProfileInput {
  name: string
  email: string
  phone: string
}

export interface UserRepository {
  findActiveByCpf(cpf: string): Promise<UserRecord | null>
  findByEmail(email: string): Promise<UserRecord | null>
  findById(userId: string): Promise<UserRecord | null>
  findActiveById(userId: string): Promise<UserRecord | null>
  existsByCpf(cpf: string): Promise<boolean>
  existsByEmail(email: string): Promise<boolean>
  existsByPhone(phone: string): Promise<boolean>
  existsByEmailExcludingId(email: string, userId: string): Promise<boolean>
  create(input: CreateUserInput): Promise<void>
  updateLastAccess(userId: string, isoDate: string): Promise<void>
  updateProfile(userId: string, input: UpdateUserProfileInput): Promise<Pick<UserRecord, "id" | "name" | "cpf" | "phone" | "email"> | null>
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>
}

