import { Student, makeName } from "./constants";

export const FIND_LIMIT = 8;

type Row = {
  id: string;
  prefix: string | null;
  first: string | null;
  last: string | null;
  house: number | null;
  program: string | null;
};

// ค้นหาสาธารณะ: รหัสตรงตัว / รหัสเฉพาะตัวเลข / ชื่อ-สกุลมีคำค้น — จำกัดผลลัพธ์กันการกวาดข้อมูล
export function findStudents(
  rows: Row[],
  q: string,
  houseUrl: Record<number, string>,
): Student[] {
  const query = (q || "").trim();
  if (query.length < 2) return [];
  const qn = query.toLowerCase();
  const qDigits = query.replace(/\D/g, "");
  const out: Student[] = [];
  for (const r of rows) {
    const id = String(r.id);
    const first = (r.first || "").trim();
    const last = (r.last || "").trim();
    const name = (first + " " + last).toLowerCase();
    const hit = id === query || (qDigits && id === qDigits) || name.indexOf(qn) >= 0;
    if (hit) {
      const prefix = (r.prefix || "").trim();
      const house = Number(r.house) || 0;
      out.push({
        id,
        prefix,
        first,
        last,
        house,
        program: (r.program || "").trim(),
        name: makeName(prefix, first, last),
        fullname: (first + " " + last).trim(),
        lineUrl: houseUrl[house] || "",
      });
      if (out.length >= FIND_LIMIT) break;
    }
  }
  return out;
}
