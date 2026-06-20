import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { SLOTS, SLOT_COL, SLOT_AT_COL, SlotId, rowToRec } from "@/lib/constants";


// เช็ค/ยกเลิกการเช็คชื่อ 1 ช่วง — timestamp ถูกใส่ที่เซิร์ฟเวอร์ (เชื่อถือได้)
export async function POST(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let id = "", slot = "" as SlotId, val = false;
  try {
    const body = await req.json();
    id = String(body?.id || "").trim();
    slot = String(body?.slot || "") as SlotId;
    val = !!body?.val;
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  if (!id || SLOTS.indexOf(slot) < 0) {
    return NextResponse.json({ ok: false, error: "bad-params" }, { status: 400 });
  }

  try {
    const supa = supabaseAdmin();
    const now = new Date().toISOString();
    const col = SLOT_COL[slot];
    const atCol = SLOT_AT_COL[slot];
    const patch: Record<string, any> = {
      student_id: id,
      [col]: val,
      [atCol]: val ? now : null,
      updated_at: now,
    };
    const { data, error } = await supa
      .from("attendance")
      .upsert(patch, { onConflict: "student_id" })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id, rec: rowToRec(data) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
