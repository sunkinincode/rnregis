import { NextRequest, NextResponse } from "next/server";
import { checkPassword, signSession, signRealtimeToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password || "");
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const ok = await checkPassword(password);
  if (!ok) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const [session, token] = await Promise.all([signSession(), signRealtimeToken()]);
  const res = NextResponse.json({ ok: true, token });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
