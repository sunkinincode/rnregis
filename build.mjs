// Build standalone index.html from src/app.template.html
// Injects: embedded data, qrcode library, staff PIN hash, default backend URL.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("./", import.meta.url);
const read = p => readFileSync(new URL(p, ROOT), "utf8");

// ---- configurable ----
// รหัสผ่านเจ้าหน้าที่ — ต้องส่งผ่าน env ตอน build เท่านั้น ห้าม hard-code ลงไฟล์/GitHub
// เช่น:  STAFF_PIN="your-passcode" node build.mjs
const STAFF_PIN = process.env.STAFF_PIN || "CHANGE-ME";   // ค่า placeholder (ไม่ใช่รหัสจริง)
const BACKEND_URL = process.env.BACKEND_URL || "";      // optional: bake the Apps Script URL for all devices

// บดบังลิงก์ backend (XOR + base64) ให้ตรงกับ _deobf() ในหน้าเว็บ
function obfuscate(s) {
  if (!s) return "";
  const key = "rnregis"; let x = "";
  for (let i = 0; i < s.length; i++) x += String.fromCharCode(s.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return Buffer.from(x, "binary").toString("base64");
}

const template = read("src/app.template.html");
const houses = JSON.stringify(JSON.parse(read("_qr.json")));   // {"1": lineUrl, ...} — ไม่ใช่ PII (ไม่มีรายชื่อ)
const qrlib = read("package/dist/qrcode.js");
const pinHash = createHash("sha256").update(STAFF_PIN).digest("hex");
const backendEnc = obfuscate(BACKEND_URL);
const build = new Date().toISOString().slice(0, 10);

let out = template
  .replace("/*__QRLIB__*/", () => qrlib)
  .replace("/*__HOUSES__*/", () => houses)
  .replace("__PIN_HASH__", pinHash)
  .replace("__BACKEND_ENC__", () => backendEnc)
  .replace("__BUILD__", build);

// sanity: no leftover placeholders
const leftovers = out.match(/__[A-Z_]+__|\/\*__[A-Z_]+__\*\//g);
if (leftovers) { console.error("Unreplaced placeholders:", leftovers); process.exit(1); }

writeFileSync(new URL("index.html", ROOT), out);
console.log(`Built index.html  (${(out.length/1024).toFixed(0)} KB)  hash=${pinHash.slice(0,12)}…  backend=${BACKEND_URL?"set (obfuscated)":"(none)"}`);
