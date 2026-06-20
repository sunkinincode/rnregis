// แปลงรายชื่อจาก roster-import.csv → ไฟล์ SQL พร้อมรันใน Supabase SQL Editor
// (ทางเลือกแทน `npm run seed` สำหรับคนที่อยากทำผ่าน SQL Editor)
//   npm run roster:sql  →  supabase/seed-students.sql
//
// ต้องรัน students ก่อน attendance (attendance มี FK ไปหา students.id)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const inPath = join(ROOT, "roster-import.csv");
if (!existsSync(inPath)) {
  console.error("✗ ไม่พบ roster-import.csv ที่รากโปรเจกต์");
  process.exit(1);
}

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
const header = rows.shift().map((h) => h.trim().toLowerCase());
const c = (n) => header.indexOf(n);
const cId = c("id"), cPre = c("prefix"), cFirst = c("first"), cLast = c("last"), cHouse = c("house"), cProg = c("program");
if ([cId, cPre, cFirst, cLast, cHouse, cProg].some((x) => x < 0)) {
  console.error("✗ หัวคอลัมน์ต้องเป็น id, prefix, first, last, house, program — พบ:", header);
  process.exit(1);
}

const s = (v) => "'" + String(v == null ? "" : v).trim().replace(/'/g, "''") + "'";
const values = [];
for (const r of rows) {
  const id = String(r[cId] || "").trim();
  if (!id) continue;
  const house = parseInt(r[cHouse], 10) || 0;
  values.push(`  (${s(id)}, ${s(r[cPre])}, ${s(r[cFirst])}, ${s(r[cLast])}, ${house}, ${s(r[cProg])})`);
}

const sql =
  `-- รายชื่อนักศึกษา (สร้างโดย roster-to-sql.mjs) — รันก่อน seed-attendance.sql\n\n` +
  `insert into public.students (id, prefix, first, last, house, program)\nvalues\n` +
  values.join(",\n") +
  `\non conflict (id) do update set\n` +
  `  prefix = excluded.prefix, first = excluded.first, last = excluded.last,\n` +
  `  house = excluded.house, program = excluded.program;\n`;

const outPath = join(__dirname, "seed-students.sql");
writeFileSync(outPath, sql, "utf8");
console.log(`✓ สร้าง ${outPath}  (${values.length} รายชื่อ)`);
console.log(`  → วางใน Supabase SQL Editor → Run  (ก่อน seed-attendance.sql)`);
