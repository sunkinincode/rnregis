// helper สำหรับระบบสายรหัส — ดูจากเลขขึ้นต้นรหัสนักศึกษาว่าเป็นน้องหรือพี่

export type SaiRole = "junior" | "senior";

export type SaiInfo = {
  year: number;
  role: SaiRole | null;
  label: string;
};

// 69 = น้องรหัส (ปี 1) · 68/67/66 = พี่รหัส (ปี 2/3/4)
export function saiInfo(studentId: string): SaiInfo {
  const m = /^(\d{2})\d{8}$/.exec((studentId || "").trim());
  if (!m) return { year: 0, role: null, label: "" };
  const y = parseInt(m[1], 10);
  switch (y) {
    case 69: return { year: 69, role: "junior", label: "น้องรหัส (ปี 1)" };
    case 68: return { year: 68, role: "senior", label: "พี่รหัส (ปี 2)" };
    case 67: return { year: 67, role: "senior", label: "พี่รหัส (ปี 3)" };
    case 66: return { year: 66, role: "senior", label: "พี่รหัส (ปี 4)" };
    default: return { year: y, role: null, label: "" };
  }
}

// กุญแจสายรหัส = เลข 3 ตัวท้ายของรหัส (คนสายเดียวกันตรงกัน)
export function saiKey(studentId: string): string {
  return (studentId || "").trim().slice(-3);
}

// ปี → คอลัมน์ช่องทางติดต่อในตาราง sai_lines
export const YEAR_COL: Record<number, "c69" | "c68" | "c67" | "c66"> = {
  69: "c69", 68: "c68", 67: "c67", 66: "c66",
};

// หนึ่งสายรหัส
export type SaiLine = {
  sai_key: string;
  junior_id: string | null;
  c69: string | null;
  c68: string | null;
  c67: string | null;
  c66: string | null;
  updated_at?: string;
};

// แตกสายเป็นรายชั้นปี (เรียงปี 1→4) สำหรับแสดงผล
export const SAI_YEARS: { year: number; col: "c69" | "c68" | "c67" | "c66"; label: string; emoji: string }[] = [
  { year: 69, col: "c69", label: "น้องรหัส · ปี 1", emoji: "🌱" },
  { year: 68, col: "c68", label: "พี่รหัส · ปี 2", emoji: "⭐" },
  { year: 67, col: "c67", label: "พี่รหัส · ปี 3", emoji: "⭐" },
  { year: 66, col: "c66", label: "พี่รหัส · ปี 4", emoji: "⭐" },
];
