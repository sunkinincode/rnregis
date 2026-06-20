-- ============================================================
--  สายรหัส — ตาราง "สาย" (1 แถว = 1 สายรหัส คีย์ด้วยเลขท้าย 3 ตัว)
--  เก็บช่องทางติดต่อของแต่ละชั้นปีในสายนั้น (รหัส 69/68/67/66)
--  วางใน Supabase → SQL Editor → Run
--
--  ⚠️ DROP ตารางเดิมทิ้งก่อน (ถ้ามีข้อมูลจริงให้สำรองก่อน)
-- ============================================================

drop table if exists public.sai_contacts cascade;   -- ของเวอร์ชันก่อน (ถ้ามี)
drop table if exists public.sai_lines cascade;

create table public.sai_lines (
  sai_key    text primary key check (sai_key ~ '^[0-9]{3}$'),   -- เลข 3 ตัวท้ายของรหัส
  junior_id  text,                                              -- รหัสน้อง (69) เต็ม ไว้อ้างอิง
  c69 text,                                                     -- ช่องทางติดต่อ รหัส 69 (น้อง)
  c68 text,                                                     -- รหัส 68 (พี่ปี 2)
  c67 text,                                                     -- รหัส 67 (พี่ปี 3)
  c66 text,                                                     -- รหัส 66 (พี่ปี 4)
  updated_at timestamptz not null default now()
);

-- RLS: anon อ่าน/เขียนตรงไม่ได้ (เข้าผ่าน API/service-role เท่านั้น) กันช่องทางติดต่อรั่ว
alter table public.sai_lines enable row level security;

drop policy if exists "staff read sai" on public.sai_lines;
create policy "staff read sai" on public.sai_lines
  for select using ( (auth.jwt() ->> 'staff') = 'true' );
