"use client";
import { Student, AttMap, rowToRec, makeName } from "./constants";

async function jget(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || j?.error === "unauthorized") throw new Error("unauthorized");
  if (!r.ok || !j?.ok) throw new Error(j?.error || "http " + r.status);
  return j;
}
async function jpost(url: string, body: any) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || j?.error === "unauthorized") throw new Error("unauthorized");
  if (!r.ok || !j?.ok) throw new Error(j?.error || "http " + r.status);
  return j;
}

// ── สาธารณะ (นักศึกษา) ──
export async function apiFind(q: string): Promise<Student[]> {
  const j = await jget("/api/find?q=" + encodeURIComponent(q) + "&t=" + Date.now());
  return (j.rows || []) as Student[];
}

// ── เจ้าหน้าที่ ──
export async function staffLogin(password: string): Promise<string> {
  const j = await jpost("/api/staff/login", { password });
  return j.token as string; // realtime token
}
export async function staffLogout(): Promise<void> {
  await fetch("/api/staff/logout", { method: "POST" });
}
export async function staffToken(): Promise<string> {
  const j = await jget("/api/staff/token");
  return j.token as string;
}
export async function staffList(): Promise<{ students: Student[]; att: AttMap }> {
  const j = await jget("/api/staff/list");
  const students: Student[] = (j.students || []).map((r: any) => {
    const prefix = (r.prefix || "").trim();
    const first = (r.first || "").trim();
    const last = (r.last || "").trim();
    return {
      id: String(r.id),
      prefix,
      first,
      last,
      house: Number(r.house) || 0,
      program: (r.program || "").trim(),
      name: makeName(prefix, first, last),
      fullname: (first + " " + last).trim(),
    } as Student;
  });
  const att: AttMap = {};
  for (const row of j.attendance || []) att[String(row.student_id)] = rowToRec(row);
  return { students, att };
}
export async function staffMark(id: string, slot: string, val: boolean) {
  const j = await jpost("/api/staff/mark", { id, slot, val });
  return j.rec; // AttRec
}
