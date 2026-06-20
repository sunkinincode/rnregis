-- ============================================================
--  สายรหัส — ตารางเก็บช่องทางติดต่อ (แทน Google Sheet)
--  วางใน Supabase → SQL Editor → Run
--
--  ⚠️ ถ้าเคยรันเวอร์ชันก่อนหน้าแล้ว ไฟล์นี้จะ DROP ตารางเดิมทิ้งก่อน
--     (ตารางนี้ยังไม่มีข้อมูลจริง — ถ้ามีข้อมูลแล้วให้สำรองก่อน)
-- ============================================================

drop table if exists public.sai_contacts cascade;

create table public.sai_contacts (
  student_id text primary key
    check (student_id ~ '^[0-9]{10}$' and left(student_id, 2) in ('66','67','68','69')),
  contact    text not null,                  -- ช่องทางติดต่อ (บังคับ)
  name       text,                           -- ชื่อ-นามสกุล (ไม่บังคับ)
  nickname   text,                           -- ชื่อเล่น (ไม่บังคับ)
  message    text,                           -- ข้อความ (ไม่บังคับ)
  -- ปี/บทบาท คำนวณจากเลขขึ้นต้นรหัสอัตโนมัติ → ตอน import ใส่แค่ student_id + contact ก็พอ
  year int  generated always as (left(student_id, 2)::int) stored,
  role text generated always as (case when left(student_id, 2) = '69' then 'junior' else 'senior' end) stored,
  -- เลข 3 ตัวท้าย = กุญแจสายรหัส (คนสายเดียวกันตรงกัน)
  sai_key text generated always as (right(student_id, 3)) stored,
  updated_at timestamptz not null default now()
);

create index if not exists sai_key_idx on public.sai_contacts (sai_key);

-- เปิด RLS — anon อ่าน/เขียนตรงไม่ได้เลย (เข้าผ่าน API/service-role เท่านั้น) กันช่องทางติดต่อรั่ว
alter table public.sai_contacts enable row level security;

drop policy if exists "staff read sai" on public.sai_contacts;
create policy "staff read sai" on public.sai_contacts
  for select using ( (auth.jwt() ->> 'staff') = 'true' );
