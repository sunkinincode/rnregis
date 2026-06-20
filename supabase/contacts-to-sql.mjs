// แปลงไฟล์ "ช่องทางการติดต่อในสายรหัส.xlsx" → ไฟล์ SQL พร้อมรันใน Supabase
//   npm run sai:sql   →  supabase/seed-sai.sql
//
// โครงไฟล์ Excel (ชีตแรก): คอลัมน์
//   A รหัสนักศึกษา(น้อง 69) | B ติดต่อรหัส69 | C ติดต่อรหัส68 | D ติดต่อรหัส67 | E ติดต่อรหัส66
// แมปเป็นตาราง sai_lines: sai_key (เลข 3 ตัวท้ายของรหัสน้อง), junior_id, c69, c68, c67, c66

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// หาไฟล์ .xlsx ที่ราก (เผื่อชื่อไฟล์ไม่ตรงเป๊ะ)
const xlsxName =
  readdirSync(ROOT).find((f) => f.includes("สายรหัส") && f.endsWith(".xlsx")) ||
  readdirSync(ROOT).find((f) => f.endsWith(".xlsx"));
if (!xlsxName) {
  console.error("✗ ไม่พบไฟล์ .xlsx ที่รากโปรเจกต์");
  process.exit(1);
}
console.log("อ่านไฟล์:", xlsxName);

const wb = XLSX.readFile(join(ROOT, xlsxName));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
rows.shift(); // ตัด header

const clean = (v) => {
  const s = String(v == null ? "" : v).trim();
  return s ? s : null;
};
const sqlStr = (s) => (s == null ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'");

const seen = new Set();
const values = [];
let skipExample = 0, skipBad = 0, dup = 0;

for (const r of rows) {
  const note = String(r[5] || "").trim();
  if (note === "*ตัวอย่าง") { skipExample++; continue; }       // แถวตัวอย่าง
  const id = String(r[0] || "").trim();
  if (!/^69\d{8}$/.test(id)) { if (id) skipBad++; continue; }   // ต้องเป็นรหัสน้อง 69 ครบ 10 หลัก
  const key = id.slice(-3);
  if (seen.has(key)) { dup++; continue; }
  seen.add(key);
  const c69 = clean(r[1]), c68 = clean(r[2]), c67 = clean(r[3]), c66 = clean(r[4]);
  if (!c69 && !c68 && !c67 && !c66) continue;                   // ไม่มีช่องทางติดต่อเลย ข้าม
  values.push(
    `  (${sqlStr(key)}, ${sqlStr(id)}, ${sqlStr(c69)}, ${sqlStr(c68)}, ${sqlStr(c67)}, ${sqlStr(c66)})`,
  );
}

if (!values.length) {
  console.error("✗ ไม่พบข้อมูลที่นำเข้าได้");
  process.exit(1);
}

const sql =
  `-- นำเข้าสายรหัสจาก ${xlsxName} (สร้างโดย contacts-to-sql.mjs)\n` +
  `-- ต้องสร้างตารางก่อนด้วย supabase/sai-schema.sql\n\n` +
  `insert into public.sai_lines (sai_key, junior_id, c69, c68, c67, c66)\nvalues\n` +
  values.join(",\n") +
  `\non conflict (sai_key) do update set\n` +
  `  junior_id = excluded.junior_id,\n` +
  `  c69 = excluded.c69, c68 = excluded.c68, c67 = excluded.c67, c66 = excluded.c66,\n` +
  `  updated_at = now();\n`;

writeFileSync(join(__dirname, "seed-sai.sql"), sql, "utf8");
console.log(`✓ สร้าง supabase/seed-sai.sql  (${values.length} สาย)`);
console.log(`  ข้ามแถวตัวอย่าง ${skipExample} · รหัสไม่ถูกต้อง ${skipBad} · เลขท้ายซ้ำ ${dup}`);
console.log(`  → วางใน Supabase → SQL Editor → Run (หลังรัน sai-schema.sql แล้ว)`);
