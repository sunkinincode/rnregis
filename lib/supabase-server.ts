import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

// client ฝั่งเซิร์ฟเวอร์ ใช้ service-role key → bypass RLS
// **ห้าม** ส่ง key นี้ออกไปฝั่ง browser เด็ดขาด
export function supabaseAdmin(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
