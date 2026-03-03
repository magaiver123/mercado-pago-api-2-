import { getSupabaseAdminClient } from "@/api/config/database"

export class BaseSupabaseRepository {
  protected readonly db: any = getSupabaseAdminClient()
}
