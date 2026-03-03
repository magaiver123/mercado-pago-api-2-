import { MenuRepository } from "@/api/repositories/contracts/menu-repository"
import { OrderRepository } from "@/api/repositories/contracts/order-repository"
import { PasswordResetRepository } from "@/api/repositories/contracts/password-reset-repository"
import { StockRepository } from "@/api/repositories/contracts/stock-repository"
import { TotemRepository } from "@/api/repositories/contracts/totem-repository"
import { UserRepository } from "@/api/repositories/contracts/user-repository"
import { KioskSlideRepository } from "@/api/repositories/contracts/kiosk-slide-repository"
import { KioskSlideSupabaseRepository } from "@/api/repositories/supabase/kiosk-slide-supabase-repository"
import { MenuSupabaseRepository } from "@/api/repositories/supabase/menu-supabase-repository"
import { OrderSupabaseRepository } from "@/api/repositories/supabase/order-supabase-repository"
import { PasswordResetSupabaseRepository } from "@/api/repositories/supabase/password-reset-supabase-repository"
import { StockSupabaseRepository } from "@/api/repositories/supabase/stock-supabase-repository"
import { TotemSupabaseRepository } from "@/api/repositories/supabase/totem-supabase-repository"
import { UserSupabaseRepository } from "@/api/repositories/supabase/user-supabase-repository"

export interface RepositoryFactory {
  user: UserRepository
  menu: MenuRepository
  order: OrderRepository
  totem: TotemRepository
  passwordReset: PasswordResetRepository
  kioskSlide: KioskSlideRepository
  stock: StockRepository
}

let cachedFactory: RepositoryFactory | null = null

export function getRepositoryFactory(): RepositoryFactory {
  if (!cachedFactory) {
    cachedFactory = {
      user: new UserSupabaseRepository(),
      menu: new MenuSupabaseRepository(),
      order: new OrderSupabaseRepository(),
      totem: new TotemSupabaseRepository(),
      passwordReset: new PasswordResetSupabaseRepository(),
      kioskSlide: new KioskSlideSupabaseRepository(),
      stock: new StockSupabaseRepository(),
    }
  }

  return cachedFactory
}

