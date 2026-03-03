import { createClient } from "@supabase/supabase-js"
import { getDatabaseEnv } from "@/api/config/env"

let supabaseAdminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const { supabaseUrl, supabaseServiceRoleKey } = getDatabaseEnv()
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    })
  }

  return supabaseAdminClient
}

