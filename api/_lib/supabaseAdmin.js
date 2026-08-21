import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "X-Client-Info": "licitia-mercado-publico-sync" } },
    });
  }
  return client;
}
