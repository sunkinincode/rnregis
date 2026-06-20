-- ============================================================
--  สายรหัส — ตารางเก็บช่องทางติดต่อ (แทน Google Sheet)
--  วางใน Supabase → SQL Editor → Run (ครั้งเดียว)
-- ============================================================

create table if not exists public.sai_contacts (
  student_id text primary key,
  year       int  not null,                 -- 69 = น้องรหัส, 68/67/66 = พี่รหัส
  role       text not null,                  -- 'junior' | 'senior'
  name       text not null,                  -- ชื่อ-นามสกุล
  nickname   text,                           -- ชื่อเล่น
  contact    text not null,                  -- ช่องทางติดต่อ (Line/IG/เบอร์)
  message    text,                           -- ข้อความถึงรุ่นพี่/รุ่นน้อง (ไม่บังคับ)
  updated_at timestamptz not null default now()
);

-- เปิด RLS — anon อ่าน/เขียนตรงไม่ได้เลย (เข้าผ่าน API/service-role เท่านั้น) กันข้อมูลติดต่อรั่ว
alter table public.sai_contacts enable row level security;

drop policy if exists "staff read sai" on public.sai_contacts;
create policy "staff read sai" on public.sai_contacts
  for select using ( (auth.jwt() ->> 'staff') = 'true' );
