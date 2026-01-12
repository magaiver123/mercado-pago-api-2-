"use client"

import { ReactNode } from "react"
import { useIdleLogout } from "@/hooks/use-idle-logout"

export function IdleProvider({ children }: { children: ReactNode }) {
  useIdleLogout()
  return <>{children}</>
}
