// helper สำหรับระบบสายรหัส — ดูจากเลขขึ้นต้นรหัสนักศึกษาว่าเป็นน้องหรือพี่

export type SaiRole = "junior" | "senior";

export type SaiInfo = {
  year: number;
  role: SaiRole | null;
  label: string; // ป้ายแสดงผล
};

// 69 = น้องรหัส (ปี 1) · 68/67/66 = พี่รหัส (ปี 2/3/4)
export function saiInfo(studentId: string): SaiInfo {
  const m = /^(\d{2})\d{8}$/.exec((studentId || "").trim());
  if (!m) return { year: 0, role: null, label: "" };
  const y = parseInt(m[1], 10);
  switch (y) {
    case 69:
      return { year: 69, role: "junior", label: "น้องรหัส (ปี 1)" };
    case 68:
      return { year: 68, role: "senior", label: "พี่รหัส (ปี 2)" };
    case 67:
      return { year: 67, role: "senior", label: "พี่รหัส (ปี 3)" };
    case 66:
      return { year: 66, role: "senior", label: "พี่รหัส (ปี 4)" };
    default:
      return { year: y, role: null, label: "" };
  }
}

// กุญแจสายรหัส = เลข 3 ตัวท้ายของรหัส (คนสายเดียวกันตรงกัน)
export function saiKey(studentId: string): string {
  return (studentId || "").trim().slice(-3);
}

export type SaiContact = {
  student_id: string;
  year: number;
  role: SaiRole;
  name: string;
  nickname: string | null;
  contact: string;
  message: string | null;
  updated_at?: string;
};
