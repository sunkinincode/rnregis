# ระบบกิจกรรมรับน้อง — ค้นหาบ้าน & เช็คชื่อ

เว็บแอป **Next.js + Supabase** deploy บน **Cloudflare Pages** มี 2 บทบาทแยกกัน

| บทบาท | ใครใช้ | เข้าอย่างไร |
|---|---|---|
| 🔍 ค้นหาบ้าน | นักศึกษาทั่วไป | หน้าแรก `/` (ผ่านหน้า **ยินยอม PDPA** ก่อน) |
| ✅ หน่วยลงทะเบียน | เจ้าหน้าที่ | หน้า `/staff` → ใส่ **รหัสผ่าน** |

> 🔒 **ความเป็นส่วนตัว (PDPA) + ความปลอดภัย**
> - รายชื่อ + รหัสนักศึกษาเก็บใน **Supabase (Postgres)** เท่านั้น — ไม่อยู่ใน GitHub และไม่ฝังในหน้าเว็บ
> - **หน้านักศึกษา** ค้นทีละคนผ่าน API ของเซิร์ฟเวอร์ (คืนเฉพาะคนที่ตรง สูงสุด 8 รายการ) — เบราว์เซอร์ไม่เคยดึงรายชื่อทั้งก้อน
> - **หน้าเจ้าหน้าที่** เซิร์ฟเวอร์บังคับรหัสผ่านทุกคำขอ + ทุกตารางเปิด **RLS** (กุญแจ anon อ่านตรงไม่ได้)
> - เช็คชื่อ **ซิงก์เรียลไทม์** ข้ามเครื่องผ่าน **Supabase Realtime** (ไม่ใช่ poll หน่วงๆ แบบเดิม)

---

## 🧱 สถาปัตยกรรมโดยย่อ

```
เบราว์เซอร์ (Next.js / React)
   ├─ หน้านักศึกษา  → GET /api/find         → (service role) Supabase
   └─ หน้าเจ้าหน้าที่ → POST /api/staff/login  → ออก session cookie + Realtime token
                      GET  /api/staff/list   → รายชื่อ + การเช็คชื่อ
                      POST /api/staff/mark    → เช็คชื่อ (เซิร์ฟเวอร์ลง timestamp)
                      Supabase Realtime (websocket) ← อัปเดตทันทีทุกเครื่อง
```

- **Auth:** รหัสร่วมตัวเดียว เซิร์ฟเวอร์เทียบกับ `STAFF_HASH` (sha256) → ออก JWT (เซ็นด้วย `SUPABASE_JWT_SECRET`) เก็บใน cookie httpOnly และให้ browser ใช้ต่อ Realtime
- **RLS:** ตาราง `students` / `attendance` / `houses` อ่าน/เขียนได้เฉพาะ token ที่มี claim `staff=true`; API routes ใช้ service-role key (bypass RLS)

---

## ⚙️ ติดตั้งครั้งแรก (~15 นาที)

### 1) สร้างโปรเจกต์ Supabase + ตาราง
1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com)
2. เมนู **SQL Editor** → วางเนื้อหา **`supabase/schema.sql`** ทั้งหมด → **Run**
   (สร้างตาราง + RLS + เปิด Realtime + seed ลิงก์กลุ่มไลน์ 12 บ้าน)
3. เมนู **Project Settings → API** จดค่า: `Project URL`, `anon public key`, `service_role key`
4. เมนู **Project Settings → API → JWT Settings** จดค่า **JWT Secret**

### 2) ตั้งรหัสผ่านเจ้าหน้าที่ (STAFF_HASH)
รหัสผ่าน **ไม่อยู่ในโค้ด** — เก็บเป็นแฮช sha256 ใน env ชื่อ `STAFF_HASH`
สร้างแฮชจากรหัสที่ต้องการ:
```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.argv[1])).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))" 'รหัสผ่านที่ตั้งเอง'
```
นำค่าที่ได้ไปใส่เป็น `STAFF_HASH`

### 3) นำเข้ารายชื่อนักศึกษา
1. คัดลอก `.env.local.example` เป็น **`.env.local`** แล้วเติมค่าจริง (ดูตัวแปรด้านล่าง)
2. รัน:
   ```bash
   npm install
   npm run seed      # อ่าน roster-import.csv → ตาราง students (ทำในเครื่อง ไม่ขึ้น GitHub)
   ```

### 4) รันในเครื่อง
```bash
npm run dev          # http://localhost:3000  (หน้าเจ้าหน้าที่: /staff)
```

---

## 🔐 ตัวแปรสภาพแวดล้อม (env)

| ตัวแปร | ลับ? | ใช้ทำอะไร |
|---|---|---|
| `SUPABASE_URL` | – | URL โปรเจกต์ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **ลับมาก** | ฝั่งเซิร์ฟเวอร์ bypass RLS |
| `SUPABASE_JWT_SECRET` | **ลับ** | เซ็น token (session + Realtime) |
| `STAFF_HASH` | **ลับ** | sha256 ของรหัสผ่านเจ้าหน้าที่ |
| `NEXT_PUBLIC_SUPABASE_URL` | – | ฝั่ง browser (Realtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | – | ฝั่ง browser (ถูกล็อกด้วย RLS) |

> ⚠️ ห้าม commit `.env.local` หรือค่าจริงใดๆ ขึ้น GitHub (อยู่ใน `.gitignore` แล้ว)

---

## 🚀 Deploy ขึ้น Cloudflare Pages

1. push โค้ดขึ้น GitHub (ข้อมูล PII และ env ไม่ขึ้นไปด้วย — ดู `.gitignore`)
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → เชื่อม GitHub repo**
3. ตั้งค่า build:
   - **Build command:** `npx @cloudflare/next-on-pages`
   - **Build output directory:** `.vercel/output/static`
   - **Compatibility flags:** เพิ่ม `nodejs_compat` (ทั้ง Production และ Preview)
4. **Settings → Environment variables** ใส่ตัวแปรทั้งหมดจากตารางด้านบน (เป็น Encrypted สำหรับค่าที่ลับ)
5. Deploy — หน้าเว็บ: `https://<project>.pages.dev` · หน้าเจ้าหน้าที่: ต่อท้าย `/staff`

> สร้าง production build ในเครื่องเพื่อทดสอบก่อนได้: `npm run pages:build`

---

## 🗂 โครงสร้างไฟล์

```
app/                    หน้าเว็บ + API routes (edge runtime)
  page.tsx              หน้านักศึกษา        staff/page.tsx  หน้าเจ้าหน้าที่
  api/find/             ค้นหาสาธารณะ
  api/staff/            login · logout · token · list · mark
components/             StudentApp, StaffApp, icons, Toasts
lib/                    auth, supabase-server/browser, find, format, constants, client
styles/globals.css     ดีไซน์ (พอร์ตจากเว็บเดิมทั้งหมด)
supabase/
  schema.sql            ตาราง + RLS + seed บ้าน
  seed-students.mjs     นำเข้ารายชื่อ (รันในเครื่อง)

── ไม่ขึ้น GitHub (.gitignore) ──
.env.local              ความลับทั้งหมด
roster-import.csv       รายชื่อ (PII)
_embed.json · *.pdf · คิวอาร์โค้ดแต่ละบ้าน/   ไฟล์ต้นฉบับ (PII)
legacy/                 เว็บเวอร์ชันเก่า (HTML ไฟล์เดียว + Apps Script) เก็บไว้อ้างอิง
```

---

## การใช้งาน

### นักศึกษา
เข้าเว็บ → ยอมรับ PDPA → พิมพ์ **รหัส** หรือ **ชื่อ-นามสกุล** → เจอบ้าน + กลุ่มไลน์ (ปุ่ม + QR) · มีเช็คลิสต์ 3 ขั้น และการ์ดสายรหัส

### เจ้าหน้าที่ (เช็คชื่อ 3 ช่วง)
1. `/staff` → ใส่รหัสผ่าน
2. เลือกช่วง (20 มิ.ย. / 21 มิ.ย. / ออกงาน)
3. **สแกนบาร์โค้ด** หรือพิมพ์รหัสแล้ว Enter → เช็คทันที (บันทึกเวลาให้)
4. ครบ 3 ช่วง = ได้ชั่วโมงกิจกรรม · แก้รายคนในตารางได้ · **Export CSV** (Excel ไทยไม่เพี้ยน)
5. ทุกเครื่องเห็นข้อมูลตรงกัน **เรียลไทม์** ผ่าน Supabase Realtime

---

## เปลี่ยนรหัสผ่านภายหลัง
สร้างแฮชใหม่ (ดูขั้นตอนที่ 2) แล้วแก้ค่า `STAFF_HASH` ใน Cloudflare → Redeploy · ควรเปลี่ยนรหัสหลังจบกิจกรรม
