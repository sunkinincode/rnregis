import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "edge";

// รายชื่อทั้งหมด + การเช็คชื่อทั้งหมด (ต้องล็อกอินเจ้าหน้าที่)
export async function GET(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const supa = supabaseAdmin();
    const [studentsRes, attRes] = await Promise.all([
      supa
        .from("students")
        .select("id,prefix,first,last,house,program")
        .order("id", { ascending: true })
        .limit(5000),
      supa.from("attendance").select("*").limit(5000),
    ]);
    if (studentsRes.error) throw studentsRes.error;
    if (attRes.error) throw attRes.error;

    return NextResponse.json({
      ok: true,
      students: studentsRes.data || [],
      attendance: attRes.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
