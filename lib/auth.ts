import { SignJWT, jwtVerify } from "jose";
import { env, requireEnv } from "./env";

export const SESSION_COOKIE = "staff_session";

function secret() {
  return new TextEncoder().encode(requireEnv("SUPABASE_JWT_SECRET"));
}

async function sha256hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ตรวจรหัสผ่านเจ้าหน้าที่กับ STAFF_HASH (sha256) แบบ constant-time
export async function checkPassword(pw: string): Promise<boolean> {
  const want = env("STAFF_HASH").toLowerCase();
  if (!want || !pw) return false;
  const got = await sha256hex(pw);
  return timingSafeEqual(got, want);
}

// session token (เก็บใน httpOnly cookie) — ใช้ยืนยันสิทธิ์ของ API routes
export async function signSession(): Promise<string> {
  return new SignJWT({ staff: true, kind: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload?.staff === true;
  } catch {
    return false;
  }
}

// token สำหรับให้ browser เรียก supabase.realtime.setAuth() — เป็น Supabase JWT จริง
// (เซ็นด้วย JWT secret เดียวกับโปรเจกต์) มี role=authenticated + staff=true ให้ RLS ผ่าน
export async function signRealtimeToken(): Promise<string> {
  return new SignJWT({ role: "authenticated", staff: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .setAudience("authenticated")
    .setSubject("staff")
    .sign(secret());
}
