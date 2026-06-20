"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// client ฝั่ง browser ใช้ anon key — ถูกล็อกด้วย RLS
// ใช้เฉพาะ Realtime (subscribe การเปลี่ยนแปลงของ attendance) หลัง setAuth ด้วย staff token
let _client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return _client;
}
