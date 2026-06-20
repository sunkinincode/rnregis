import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { saiInfo, saiKey } from "@/lib/sai";

export const dynamic = "force-dynamic";

// ค้นสายรหัสของตัวเอง — กรอกรหัสตัวเอง คืน "สาย" ที่เลข 3 ตัวท้ายตรงกัน (ช่องทางติดต่อทั้ง 4 ชั้นปี)
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
    const key = saiKey(studentId);
    const { data, error } = await supa.from("sai_lines").select("*").eq("sai_key", key).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, saiKey: key, you: info.year, line: data || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
