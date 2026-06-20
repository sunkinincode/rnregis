// แปลงข้อมูลการเช็คชื่อจาก Google Sheet (แท็บ attendance เดิม) → ไฟล์ SQL พร้อมรันบน Supabase
//
// วิธีใช้:
//   1) ใน Google Sheet เปิดแท็บ "attendance" → File → Download → Comma-separated values (.csv)
//   2) เซฟไฟล์ไว้ที่รากโปรเจกต์ชื่อ  attendance-export.csv
//   3) รัน:  npm run sheet:sql
//   4) เปิด supabase/seed-attendance.sql → คัดลอกไปวางใน Supabase → SQL Editor → Run
//      (ต้อง seed ตาราง students ก่อน เพราะ attendance มี foreign key ไปหา students.id)
//
// คอลัมน์แท็บเดิม: id | d1 | t_d1 | d2 | t_d2 | out | t_out | updated
// แมปเป็นตารางใหม่: student_id | d1,d1_at | d2,d2_at | dout,dout_at | updated_at
//
// เวลา (timestamp) ถือเป็นเวลาประเทศไทย (+07) — แก้ TZ ด้านล่างได้ถ้าจำเป็น

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TZ = "+07"; // เขตเวลาที่ใช้ตอนเช็คชื่อ (ไทย)

const inPath = join(ROOT, "attendance-export.csv");
if (!existsSync(inPath)) {
  console.error("✗ ไม่พบ attendance-export.csv ที่รากโปรเจกต์");
  console.error("  → เปิดแท็บ attendance ใน Google Sheet แล้ว File → Download → .csv");
  console.error("  → เซฟชื่อ attendance-export.csv ไว้ที่ " + ROOT);
  process.exit(1);
}

// ── CSV parser (รองรับฟิลด์ในเครื่องหมายคำพูด) ──
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

const rows = parseCsv(readFileSync(inPath, "utf8"));
if (!rows.length) { console.error("✗ ไฟล์ว่าง"); process.exit(1); }

const header = rows.shift().map((h) => h.trim().toLowerCase());
const col = (name) => header.indexOf(name);
const cId = col("id");
const map = {
  d1: { v: col("d1"), t: col("t_d1") },
  d2: { v: col("d2"), t: col("t_d2") },
  out: { v: col("out"), t: col("t_out") },
};
if (cId < 0) {
  console.error("✗ ไม่พบคอลัมน์ id — หัวตารางที่พบ:", header);
  process.exit(1);
}

const truthy = (s) => {
  const v = String(s == null ? "" : s).trim().toLowerCase();
  return v !== "" && v !== "0" && v !== "false" && v !== "no" && v !== "ไม่";
};

// แปลงค่าเวลา → 'yyyy-mm-dd hh:mm:ss' (หรือ null)
function toTs(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  // ตัวเลขล้วน = epoch ms (ข้อมูลเก่าบางแถว)
  if (/^\d{10,}$/.test(s)) {
    const d = new Date(Number(s));
    if (!isNaN(d.getTime())) return fmt(d);
  }
  // รูปแบบ yyyy-mm-dd hh:mm:ss อยู่แล้ว → ใช้ตรงๆ
  if (/^\d{4}-\d{2}-\d{2}[ t]\d{2}:\d{2}/.test(s)) return s.replace("T", " ").slice(0, 19);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : fmt(d);
}
function fmt(d) {
  const p = (n) => ("0" + n).slice(-2);
  return (
    d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds())
  );
}

const sqlStr = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sqlTs = (t) => (t ? "'" + t + TZ + "'::timestamptz" : "NULL");
const sqlBool = (b) => (b ? "true" : "false");

const values = [];
let kept = 0, checks = 0;
for (const r of rows) {
  const id = String(r[cId] || "").trim();
  if (!id) continue;
  const d1 = map.d1.v >= 0 && truthy(r[map.d1.v]);
  const d2 = map.d2.v >= 0 && truthy(r[map.d2.v]);
  const dout = map.out.v >= 0 && truthy(r[map.out.v]);
  // ข้ามแถวที่ไม่ได้เช็คเลย (ไม่ต้องเขียนลงฐาน)
  if (!d1 && !d2 && !dout) continue;
  const d1At = d1 ? toTs(map.d1.t >= 0 ? r[map.d1.t] : "") : null;
  const d2At = d2 ? toTs(map.d2.t >= 0 ? r[map.d2.t] : "") : null;
  const doutAt = dout ? toTs(map.out.t >= 0 ? r[map.out.t] : "") : null;
  checks += (d1 ? 1 : 0) + (d2 ? 1 : 0) + (dout ? 1 : 0);
  kept++;
  values.push(
    `  (${sqlStr(id)}, ${sqlBool(d1)}, ${sqlTs(d1At)}, ${sqlBool(d2)}, ${sqlTs(d2At)}, ${sqlBool(dout)}, ${sqlTs(doutAt)}, now())`,
  );
}

if (!values.length) {
  console.error("✗ ไม่พบแถวที่มีการเช็คชื่อเลย");
  process.exit(1);
}

const sql =
  `-- นำเข้าการเช็คชื่อจาก Google Sheet เดิม (สร้างโดย sheet-to-sql.mjs)\n` +
  `-- ต้อง seed ตาราง students ก่อน (attendance มี FK ไปหา students.id)\n` +
  `-- เวลาใช้เขตเวลา ${TZ} (ไทย)\n\n` +
  `insert into public.attendance\n` +
  `  (student_id, d1, d1_at, d2, d2_at, dout, dout_at, updated_at)\nvalues\n` +
  values.join(",\n") +
  `\non conflict (student_id) do update set\n` +
  `  d1 = excluded.d1, d1_at = excluded.d1_at,\n` +
  `  d2 = excluded.d2, d2_at = excluded.d2_at,\n` +
  `  dout = excluded.dout, dout_at = excluded.dout_at,\n` +
  `  updated_at = excluded.updated_at;\n`;

const outPath = join(__dirname, "seed-attendance.sql");
writeFileSync(outPath, sql, "utf8");
console.log(`✓ สร้าง ${outPath}`);
console.log(`  ${kept} คนที่มีการเช็คชื่อ · รวม ${checks} ครั้ง`);
console.log(`  → เปิดไฟล์นี้ คัดลอกไปวางใน Supabase → SQL Editor → Run`);
