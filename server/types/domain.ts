export type OrderStatus =
  | "pending"
  | "processing"
  | "created"
  | "at_terminal"
  | "processed"
  | "failed"
  | "error"
  | "canceled"
  | "expired"
  | "action_required"
  | "refunded"
  | "unknown"

export interface Category {
  id: string
  name: string
}

export interface ProductStock {
  quantity: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string
  is_active?: boolean
  product_stock?: ProductStock[] | null
}

export interface UserRecord {
  id: string
  cpf: string
  name: string
  phone: string
  email: string
  status: string
  role: string | null
  password_hash: string
  created_at: string | null
  last_access_at: string | null
}

export interface PasswordResetRecord {
  id: string
  user_id: string
  email: string
  code: string
  expires_at: string
  used_at: string | null
  created_at: string | null
}

export interface SignupVerificationRecord {
  id: string
  name: string
  cpf: string
  phone: string
  email: string
  password_hash: string
  email_code: string
  phone_code: string
  email_code_expires_at: string
  phone_code_expires_at: string
  email_verified_at: string | null
  phone_verified_at: string | null
  last_email_sent_at: string
  last_phone_sent_at: string
  expires_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderRecord {
  id: string
  order_number: number | null
  store_id: string
  fridge_id?: string | null
  user_id: string
  mercadopago_order_id: string
  total_amount: number
  payment_method: string | null
  status: OrderStatus | string
  items: unknown
  stock_processed?: boolean
  created_at: string
  last_receipt_email_sent_at?: string | null
}

export interface TotemRecord {
  id: string
  store_id: string
  status: string
  maintenance_mode: boolean
  activation_code: string | null
  device_id: string | null
  activated_at?: string | null
  last_seen_at?: string | null
}

export interface PublicStoreRecord {
  id: string
  slug: string | null
  name: string
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  visual_status: string | null
  visual_text: string | null
}

export interface KioskSlide {
  id: string
  image_url: string
  duration: number
}

export interface MenuBannerSlide {
  id: string
  image_url: string
  duration: number
}

export interface StoreLockRecord {
  id: string
  store_id: string
  device_id: string | null
  status: "pending" | "active" | "inactive" | string
  enabled: boolean
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface FridgeRecord {
  id: string
  store_id: string
  name: string
  code: string
  status: "active" | "inactive" | string
  is_primary: boolean
  lock_id: string
  created_at: string
  updated_at: string
}

export interface FridgeInventoryRecord {
  id: string
  store_id: string
  fridge_id: string
  product_id: string
  quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TotemPrinterRecord {
  id: string
  totem_id: string
  store_id: string
  connection_type: "tcp" | string
  ip: string
  port: number
  model: string
  escpos_profile: string
  paper_width_mm: number
  is_active: boolean
  last_heartbeat_at: string | null
  last_status: string | null
  last_error: string | null
  agent_version: string | null
  created_at: string
  updated_at: string
}

export interface PrintGlobalSettingsRecord {
  id: string
  default_connection_type: "tcp" | string
  default_port: number
  default_escpos_profile: string
  default_paper_width_mm: number
  queue_claim_interval_ms: number
  heartbeat_interval_ms: number
  max_retry_attempts: number
  created_at: string
  updated_at: string
}

export type PrintJobStatus =
  | "pending"
  | "claimed"
  | "printed"
  | "failed"
  | "canceled"

export interface PrintJobRecord {
  id: string
  totem_id: string
  store_id: string
  order_id: string
  action: string
  payload: unknown
  status: PrintJobStatus | string
  attempts: number
  claimed_at: string | null
  claimed_by: string | null
  lease_expires_at: string | null
  last_attempt_at: string | null
  next_retry_at: string | null
  printed_at: string | null
  printed_by_agent: string | null
  last_error: string | null
  error_code: string | null
  error_retryable: boolean | null
  created_at: string
  updated_at: string
}

export type PrintAgentDeviceStatus = "active" | "disabled" | "revoked"

export interface PrintAgentDeviceRecord {
  id: string
  device_id: string
  agent_id: string
  key_id: string
  hmac_secret_hash: string
  hmac_secret_ciphertext: string
  status: PrintAgentDeviceStatus | string
  min_supported_version: string | null
  last_seen_at: string | null
  last_status: string | null
  last_error: string | null
  last_agent_version: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface PrintAgentEnrollmentRecord {
  id: string
  device_id: string
  agent_id: string
  token_hash: string
  qr_signature: string
  api_base_url: string
  expires_at: string
  consumed_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}
