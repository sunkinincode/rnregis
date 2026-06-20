import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { findStudents } from "@/lib/find";

export const runtime = "edge";

// ค้นหาสาธารณะ (ไม่ต้องล็อกอิน) — คืนเฉพาะรายการที่ตรง สูงสุด 8 รายการ
// browser ไม่เคยแตะตารางตรง ทุกอย่างผ่านเซิร์ฟเวอร์ (service-role) ที่กรองให้แล้ว
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, rows: [] });

  try {
    const supa = supabaseAdmin();
    const [studentsRes, housesRes] = await Promise.all([
      supa.from("students").select("id,prefix,first,last,house,program").limit(2000),
      supa.from("houses").select("id,line_url"),
    ]);
    if (studentsRes.error) throw studentsRes.error;

    const houseUrl: Record<number, string> = {};
    for (const h of housesRes.data || []) houseUrl[h.id] = h.line_url || "";

    const rows = findStudents(studentsRes.data || [], q, houseUrl);
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
