// อ่าน env แบบปลอดภัย (อ่านตอนรันไทม์ ไม่ใช่ตอน import)
// ใช้ได้ทั้ง `next dev` (.env.local) และ Cloudflare Pages (process.env ถูก bind ให้)
export function env(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v : "";
}

export function requireEnv(key: string): string {
  const v = env(key);
  if (!v) throw new Error(`missing env: ${key}`);
  return v;
}
