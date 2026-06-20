-- ============================================================
--  ระบบกิจกรรมรับน้อง — Supabase schema
--  วางทั้งหมดนี้ใน Supabase → SQL Editor → Run (ครั้งเดียว)
-- ============================================================

-- ---------- ตาราง ----------
create table if not exists public.students (
  id       text primary key,
  prefix   text,
  first    text,
  last     text,
  house    int  not null default 0,
  program  text
);

create table if not exists public.houses (
  id        int  primary key,
  line_url  text
);

-- การเช็คชื่อ: แถวละนักศึกษา 3 ช่วง (d1 = 20 มิ.ย., d2 = 21 มิ.ย., dout = ออกงาน)
create table if not exists public.attendance (
  student_id  text primary key references public.students(id) on delete cascade,
  d1     boolean      not null default false,
  d1_at  timestamptz,
  d2     boolean      not null default false,
  d2_at  timestamptz,
  dout   boolean      not null default false,
  dout_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ให้ event UPDATE ของ Realtime ส่งข้อมูลครบทุกคอลัมน์
alter table public.attendance replica identity full;

-- ---------- เปิด RLS ทุกตาราง ----------
alter table public.students   enable row level security;
alter table public.houses     enable row level security;
alter table public.attendance enable row level security;

-- ผู้ใช้ anon (กุญแจในเบราว์เซอร์) อ่านตารางตรงไม่ได้เลย
-- จะเข้าถึงได้เฉพาะ token ที่เซิร์ฟเวอร์ของเราออกให้ (มี claim staff=true)
-- ฝั่ง API routes ใช้ service-role key ซึ่ง bypass RLS อยู่แล้ว

drop policy if exists "staff read students" on public.students;
create policy "staff read students" on public.students
  for select using ( (auth.jwt() ->> 'staff') = 'true' );

drop policy if exists "staff read houses" on public.houses;
create policy "staff read houses" on public.houses
  for select using ( (auth.jwt() ->> 'staff') = 'true' );

drop policy if exists "staff read attendance" on public.attendance;
create policy "staff read attendance" on public.attendance
  for select using ( (auth.jwt() ->> 'staff') = 'true' );

drop policy if exists "staff write attendance" on public.attendance;
create policy "staff write attendance" on public.attendance
  for all
  using ( (auth.jwt() ->> 'staff') = 'true' )
  with check ( (auth.jwt() ->> 'staff') = 'true' );

-- ---------- เปิด Realtime ให้ตาราง attendance ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;

-- ---------- seed บ้าน (ลิงก์กลุ่มไลน์ 12 บ้าน) ----------
insert into public.houses (id, line_url) values
  (1,  'https://line.me/ti/g2/EJazWUOSsBtE-wvI7aYamb1tCJCPaPB6NlrHdQ?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (2,  'https://line.me/ti/g2/d6N638qmiFLBqi1v6nqU_ybzfg2SPrraLf7Sew?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (3,  'https://line.me/ti/g2/JpcKP0x4-wBG2vi8Lwxb7nhdb1BwvjysX3ksKA?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (4,  'https://line.me/ti/g2/b71PLT9ZZHEH1pKWmO-M_kiLVuA6XVZXCUJqDQ?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (5,  'https://line.me/ti/g2/dK2scZ7N1T_A6Z0dNRa1PO_voNjPSPdadBweIA?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (6,  'https://line.me/ti/g2/D_lSYfNxFkugRCxWMV-Tn2c_7yzt7tTL-KZOMg?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (7,  'https://line.me/ti/g2/JVGky8vEcUWtcRTy6AONlvObsWAV18cLLbvcDQ?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (8,  'https://line.me/ti/g2/_XXrEAgZP6ppQt4MzYrZ3OVplBEcQ_1FBWGcdw?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (9,  'https://line.me/ti/g2/E9MQ4zRj3M37ZKrBG29dsbD-KbSRqCsgZkyObA?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (10, 'https://line.me/ti/g2/HR-A-_v0Rml_dfeEZU8zyZxM8lH2irIKCZYXmw?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (11, 'https://line.me/ti/g2/gbkuJKtNoy56AfNsAYGeCxqgmgdLPkQ5rt8eGQ?utm_source=invitation&utm_medium=QR_code&utm_campaign=default'),
  (12, 'https://line.me/ti/g2/S0ClnejFWaKYeQlsGFGTw7lURmDfFn63LgO_hA?utm_source=invitation&utm_medium=QR_code&utm_campaign=default')
on conflict (id) do update set line_url = excluded.line_url;
