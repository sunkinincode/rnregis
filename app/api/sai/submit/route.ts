import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { saiInfo } from "@/lib/sai";

export const dynamic = "force-dynamic";

// บันทึกช่องทางติดต่อสายรหัส (สาธารณะ) — บังคับแค่รหัส + ช่องทางติดต่อ
// (year/role/sai_key คำนวณในฐานข้อมูลอัตโนมัติ)
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const studentId = String(body?.studentId || "").trim();
  const name = String(body?.name || "").trim();
  const nickname = String(body?.nickname || "").trim();
  const contact = String(body?.contact || "").trim();
  const message = String(body?.message || "").trim();

  const info = saiInfo(studentId);
  if (!info.role) return NextResponse.json({ ok: false, error: "bad-id" }, { status: 400 });
  if (!contact) return NextResponse.json({ ok: false, error: "missing-contact" }, { status: 400 });
  if (name.length > 120 || contact.length > 200 || nickname.length > 60 || message.length > 500) {
    return NextResponse.json({ ok: false, error: "too-long" }, { status: 400 });
  }

  try {
    const supa = supabaseAdmin();

    // น้องรหัส (ปี 69) ต้องมีอยู่จริงในรายชื่อ — กันกรอกมั่ว (พี่รหัส 66-68 ไม่มีในฐาน จึงข้าม)
    if (info.role === "junior") {
      const { data, error } = await supa.from("students").select("id").eq("id", studentId).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ ok: false, error: "not-a-student" }, { status: 400 });
    }

    const { error } = await supa.from("sai_contacts").upsert(
      {
        student_id: studentId,
        contact,
        name: name || null,
        nickname: nickname || null,
        message: message || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, role: info.role, label: info.label });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
