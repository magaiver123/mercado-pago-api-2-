export interface UserprofileUser {
  id: string
  name: string | null
  cpf: string | null
  phone: string | null
  email: string
}

const USERPROFILE_AUTH_STORAGE_KEY = "userprofile_auth_user"

export function setUserprofileAuthUser(user: UserprofileUser) {
  if (typeof window === "undefined") return
  localStorage.setItem(USERPROFILE_AUTH_STORAGE_KEY, JSON.stringify(user))
}

export function getUserprofileAuthUser(): UserprofileUser | null {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem(USERPROFILE_AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as UserprofileUser
  } catch {
    return null
  }
}

export function clearUserprofileAuthUser() {
  if (typeof window === "undefined") return
  localStorage.removeItem(USERPROFILE_AUTH_STORAGE_KEY)
}
