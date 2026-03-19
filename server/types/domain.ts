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
  user_id: string
  mercadopago_order_id: string
  total_amount: number
  payment_method: string | null
  status: OrderStatus | string
  items: unknown
  stock_processed?: boolean
  created_at: string
}

export interface TotemRecord {
  id: string
  store_id: string
  status: string
  activation_code: string | null
  device_id: string | null
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
