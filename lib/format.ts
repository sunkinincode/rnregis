import { CHECKPOINTS, SLOTS, Student, AttMap } from "./constants";

export function fmtTs(ms: number): string {
  if (!ms) return "";
  const d = new Date(+ms);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => ("0" + n).slice(-2);
  return (
    d.getFullYear() +
    "-" + p(d.getMonth() + 1) +
    "-" + p(d.getDate()) +
    " " + p(d.getHours()) +
    ":" + p(d.getMinutes()) +
    ":" + p(d.getSeconds())
  );
}

const has = (att: AttMap, id: string, slot: "d1" | "d2") => !!(att[id] && att[id][slot]);
const tsOf = (att: AttMap, id: string, slot: "d1" | "d2") =>
  att[id] && att[id].ts ? att[id].ts[slot] : 0;
export const isComplete = (att: AttMap, id: string) => SLOTS.every((s) => has(att, id, s));

// สร้างไฟล์ CSV (Excel ไทยไม่เพี้ยน — ใส่ BOM) แล้วสั่งดาวน์โหลด
export function exportCsv(students: Student[], att: AttMap) {
  const header = [
    "รหัสนักศึกษา", "คำนำหน้า", "ชื่อ", "สกุล", "บ้าน", "หลักสูตร",
    CHECKPOINTS[0].v + " (" + CHECKPOINTS[0].date + ")", "เวลาเช็ค " + CHECKPOINTS[0].v,
    CHECKPOINTS[1].v + " (" + CHECKPOINTS[1].date + ")", "เวลาเช็ค " + CHECKPOINTS[1].v,
    "ครบ 2 ช่วง", "ได้ชั่วโมงกิจกรรม",
  ];
  const rows: (string | number)[][] = [header];
  for (const s of students) {
    const complete = isComplete(att, s.id);
    rows.push([
      s.id, s.prefix, s.first, s.last, "บ้าน " + s.house, s.program,
      has(att, s.id, "d1") ? "มา" : "", fmtTs(tsOf(att, s.id, "d1")),
      has(att, s.id, "d2") ? "มา" : "", fmtTs(tsOf(att, s.id, "d2")),
      complete ? "ครบ" : "ไม่ครบ", complete ? "ได้" : "",
    ]);
  }
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const v = c == null ? "" : String(c);
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        })
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const ts =
    d.getFullYear() +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    ("0" + d.getDate()).slice(-2) +
    "-" + ("0" + d.getHours()).slice(-2) +
    ("0" + d.getMinutes()).slice(-2);
  const a = document.createElement("a");
  a.href = url;
  a.download = "เช็คชื่อกิจกรรมรับน้อง_" + ts + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
