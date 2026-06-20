// นำเข้ารายชื่อจาก roster-import.csv → ตาราง students ใน Supabase
// รันในเครื่องเท่านั้น (ข้อมูล PII ไม่ขึ้น GitHub):  npm run seed
//
// ต้องมี env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (อ่านจาก .env.local อัตโนมัติ หรือ export เองก่อนรัน)

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── โหลด .env.local แบบง่าย ──
function loadEnv() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("✗ ต้องตั้ง SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY (ใน .env.local หรือ export)");
  process.exit(1);
}

// ── CSV parser เล็กๆ (รองรับฟิลด์ในเครื่องหมายคำพูด) ──
function parseCsv(text) {
  text = text.replace(/^﻿/, ""); // ลบ BOM
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

const csvPath = join(ROOT, "roster-import.csv");
if (!existsSync(csvPath)) {
  console.error("✗ ไม่พบไฟล์ roster-import.csv ที่ราก repo");
  process.exit(1);
}
const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows.shift().map((h) => h.trim());
const idx = (name) => header.indexOf(name);
const cId = idx("id"), cPre = idx("prefix"), cFirst = idx("first"),
  cLast = idx("last"), cHouse = idx("house"), cProg = idx("program");
if ([cId, cPre, cFirst, cLast, cHouse, cProg].some((x) => x < 0)) {
  console.error("✗ หัวคอลัมน์ต้องเป็น: id, prefix, first, last, house, program — พบ:", header);
  process.exit(1);
}

const students = rows
  .map((r) => ({
    id: String(r[cId] || "").trim(),
    prefix: (r[cPre] || "").trim(),
    first: (r[cFirst] || "").trim(),
    last: (r[cLast] || "").trim(),
    house: parseInt(r[cHouse], 10) || 0,
    program: (r[cProg] || "").trim(),
  }))
  .filter((s) => s.id);

console.log(`อ่าน ${students.length} รายชื่อจาก CSV — กำลังนำเข้า…`);

const supa = createClient(URL, KEY, { auth: { persistSession: false } });
const CHUNK = 500;
let done = 0;
for (let i = 0; i < students.length; i += CHUNK) {
  const batch = students.slice(i, i + CHUNK);
  const { error } = await supa.from("students").upsert(batch, { onConflict: "id" });
  if (error) {
    console.error("✗ ผิดพลาดช่วงแถว", i, error.message);
    process.exit(1);
  }
  done += batch.length;
  console.log(`  …นำเข้าแล้ว ${done}/${students.length}`);
}
console.log(`✓ เสร็จสิ้น — นำเข้า ${done} รายชื่อเข้าตาราง students`);
