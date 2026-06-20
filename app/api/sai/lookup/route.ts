import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { saiInfo, saiKey } from "@/lib/sai";

export const dynamic = "force-dynamic";

// ค้นสายรหัสของตัวเอง (สาธารณะ) — คืนเฉพาะคนในสายเดียวกัน (เลข 3 ตัวท้ายตรงกัน)
// ต้องกรอกข้อมูลตัวเองไว้ก่อนถึงจะดูได้ → กันการไล่เก็บข้อมูลทั้งฐาน
export async function POST(req: NextRequest) {
  let studentId = "";
  try {
    const b = await req.json();
    studentId = String(b?.studentId || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const info = saiInfo(studentId);
  if (!info.role) return NextResponse.json({ ok: false, error: "bad-id" }, { status: 400 });

  try {
    const supa = supabaseAdmin();

    // ด่าน: ต้องมีข้อมูลตัวเองในระบบก่อน
    const me = await supa.from("sai_contacts").select("student_id").eq("student_id", studentId).maybeSingle();
    if (me.error) throw me.error;
    if (!me.data) return NextResponse.json({ ok: false, error: "not-registered" }, { status: 403 });

    // คนในสายเดียวกัน (ยกเว้นตัวเอง)
    const key = saiKey(studentId);
    const { data, error } = await supa
      .from("sai_contacts")
      .select("student_id,year,role,name,nickname,contact,message")
      .eq("sai_key", key)
      .neq("student_id", studentId)
      .order("year", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ ok: true, saiKey: key, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
