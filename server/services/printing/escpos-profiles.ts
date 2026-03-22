import { sanitizeString } from "@/api/utils/sanitize"

export interface EscPosProfileOption {
  id: string
  label: string
  notes: string
}

export const ESC_POS_PROFILE_OPTIONS: EscPosProfileOption[] = [
  {
    id: "generic",
    label: "ESC/POS Generico",
    notes: "Perfil padrao para impressoras ESC/POS homologadas.",
  },
  {
    id: "bematech-mp4200",
    label: "Bematech MP-4200 TH",
    notes: "Ajustes de corte e codepage para MP-4200 TH.",
  },
]

export function suggestEscPosProfile(modelValue: unknown): string {
  const model = sanitizeString(modelValue)?.toLowerCase() ?? ""

  if (model.includes("mp-4200") || model.includes("mp4200")) {
    return "bematech-mp4200"
  }

  return "generic"
}

export function isValidEscPosProfile(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false
  return ESC_POS_PROFILE_OPTIONS.some((profile) => profile.id === value)
}
