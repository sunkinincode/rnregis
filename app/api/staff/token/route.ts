import { NextRequest, NextResponse } from "next/server";
import { verifySession, signRealtimeToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "edge";

// คืน Realtime token ใหม่ให้ browser (ใช้ตอนเปิดหน้าใหม่ที่ยังมี session cookie อยู่)
export async function GET(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const token = await signRealtimeToken();
  return NextResponse.json({ ok: true, token });
}
