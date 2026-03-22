import { MenuRepository } from "@/api/repositories/contracts/menu-repository"
import { OrderRepository } from "@/api/repositories/contracts/order-repository"
import { PasswordResetRepository } from "@/api/repositories/contracts/password-reset-repository"
import { SignupVerificationRepository } from "@/api/repositories/contracts/signup-verification-repository"
import { StockRepository } from "@/api/repositories/contracts/stock-repository"
import { TotemRepository } from "@/api/repositories/contracts/totem-repository"
import { UserRepository } from "@/api/repositories/contracts/user-repository"
import { KioskSlideRepository } from "@/api/repositories/contracts/kiosk-slide-repository"
import { StoreRepository } from "@/api/repositories/contracts/store-repository"
import { StoreLockRepository } from "@/api/repositories/contracts/store-lock-repository"
import { TotemPrinterRepository } from "@/api/repositories/contracts/totem-printer-repository"
import { PrintJobRepository } from "@/api/repositories/contracts/print-job-repository"
import { PrintGlobalSettingsRepository } from "@/api/repositories/contracts/print-global-settings-repository"
import { KioskSlideSupabaseRepository } from "@/api/repositories/supabase/kiosk-slide-supabase-repository"
import { MenuSupabaseRepository } from "@/api/repositories/supabase/menu-supabase-repository"
import { OrderSupabaseRepository } from "@/api/repositories/supabase/order-supabase-repository"
import { PasswordResetSupabaseRepository } from "@/api/repositories/supabase/password-reset-supabase-repository"
import { SignupVerificationSupabaseRepository } from "@/api/repositories/supabase/signup-verification-supabase-repository"
import { StoreLockSupabaseRepository } from "@/api/repositories/supabase/store-lock-supabase-repository"
import { StockSupabaseRepository } from "@/api/repositories/supabase/stock-supabase-repository"
import { StoreSupabaseRepository } from "@/api/repositories/supabase/store-supabase-repository"
import { TotemSupabaseRepository } from "@/api/repositories/supabase/totem-supabase-repository"
import { UserSupabaseRepository } from "@/api/repositories/supabase/user-supabase-repository"
import { TotemPrinterSupabaseRepository } from "@/api/repositories/supabase/totem-printer-supabase-repository"
import { PrintJobSupabaseRepository } from "@/api/repositories/supabase/print-job-supabase-repository"
import { PrintGlobalSettingsSupabaseRepository } from "@/api/repositories/supabase/print-global-settings-supabase-repository"

export interface RepositoryFactory {
  user: UserRepository
  menu: MenuRepository
  order: OrderRepository
  totem: TotemRepository
  passwordReset: PasswordResetRepository
  signupVerification: SignupVerificationRepository
  kioskSlide: KioskSlideRepository
  stock: StockRepository
  store: StoreRepository
  storeLock: StoreLockRepository
  totemPrinter: TotemPrinterRepository
  printJob: PrintJobRepository
  printGlobalSettings: PrintGlobalSettingsRepository
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
      signupVerification: new SignupVerificationSupabaseRepository(),
      kioskSlide: new KioskSlideSupabaseRepository(),
      stock: new StockSupabaseRepository(),
      store: new StoreSupabaseRepository(),
      storeLock: new StoreLockSupabaseRepository(),
      totemPrinter: new TotemPrinterSupabaseRepository(),
      printJob: new PrintJobSupabaseRepository(),
      printGlobalSettings: new PrintGlobalSettingsSupabaseRepository(),
    }
  }

  return cachedFactory
}
