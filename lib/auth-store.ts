// Simple auth store using localStorage for CPF-based sessions
export interface User {
  id: string
  cpf: string
  name: string
  phone: string
  email: string
}

export function setAuthUser(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_user", JSON.stringify(user))
  }
}

export function getAuthUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("auth_user")
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

export function clearAuthUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_user")
  }
}
