import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// รายการสายรหัสทั้งหมด (เฉพาะเจ้าหน้าที่)
export async function POST(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("sai_contacts")
      .select("*")
      .order("year", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
