export interface SelectedFridge {
  id: string
  name: string
  code: string
  is_primary?: boolean
}

const SELECTED_FRIDGE_KEY = "selected_fridge"

function isValidUUID(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function setSelectedFridge(fridge: SelectedFridge) {
  if (typeof window === "undefined") return
  localStorage.setItem(SELECTED_FRIDGE_KEY, JSON.stringify(fridge))
}

export function getSelectedFridge(): SelectedFridge | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SELECTED_FRIDGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SelectedFridge>
    if (!parsed?.id || !parsed?.name || !parsed?.code) return null
    if (!isValidUUID(parsed.id)) return null
    return {
      id: parsed.id,
      name: parsed.name,
      code: parsed.code,
      is_primary: parsed.is_primary === true,
    }
  } catch {
    return null
  }
}

export function clearSelectedFridge() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SELECTED_FRIDGE_KEY)
}
