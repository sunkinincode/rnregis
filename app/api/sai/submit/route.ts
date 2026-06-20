import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { saiInfo, saiKey, YEAR_COL } from "@/lib/sai";

export const dynamic = "force-dynamic";

// บันทึกช่องทางติดต่อของตัวเองลงในสาย (บังคับแค่รหัส + ช่องทางติดต่อ)
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const studentId = String(body?.studentId || "").trim();
  const contact = String(body?.contact || "").trim();

  const info = saiInfo(studentId);
  if (!info.role) return NextResponse.json({ ok: false, error: "bad-id" }, { status: 400 });
  if (!contact) return NextResponse.json({ ok: false, error: "missing-contact" }, { status: 400 });
  if (contact.length > 200) return NextResponse.json({ ok: false, error: "too-long" }, { status: 400 });

  try {
    const supa = supabaseAdmin();

    // น้องรหัส (69) ต้องมีอยู่จริงในรายชื่อ — กันกรอกมั่ว (พี่ 66-68 ไม่มีในฐาน จึงข้าม)
    if (info.role === "junior") {
      const { data, error } = await supa.from("students").select("id").eq("id", studentId).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ ok: false, error: "not-a-student" }, { status: 400 });
    }

    const key = saiKey(studentId);
    const col = YEAR_COL[info.year];
    const patch: Record<string, any> = { sai_key: key, [col]: contact, updated_at: new Date().toISOString() };
    if (info.year === 69) patch.junior_id = studentId;

    const { error } = await supa.from("sai_lines").upsert(patch, { onConflict: "sai_key" });
    if (error) throw error;

    return NextResponse.json({ ok: true, label: info.label, year: info.year, saiKey: key });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
