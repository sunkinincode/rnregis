// ค่าคงที่ที่ใช้ทั้งฝั่ง server และ client

export type SlotId = "d1" | "d2" | "out";

export const CHECKPOINTS: { id: SlotId; k: string; v: string; date: string }[] = [
  { id: "d1", k: "ช่วงที่ 1", v: "เข้างานวันแรก", date: "20 มิ.ย." },
  { id: "d2", k: "ช่วงที่ 2", v: "เข้างานวันสอง", date: "21 มิ.ย." },
  { id: "out", k: "ช่วงที่ 3", v: "ออกงาน", date: "" },
];

export const SLOTS: SlotId[] = CHECKPOINTS.map((c) => c.id);

// map slot → ชื่อคอลัมน์ในตาราง attendance (เลี่ยงคำสงวน "out")
export const SLOT_COL: Record<SlotId, "d1" | "d2" | "dout"> = {
  d1: "d1",
  d2: "d2",
  out: "dout",
};
export const SLOT_AT_COL: Record<SlotId, "d1_at" | "d2_at" | "dout_at"> = {
  d1: "d1_at",
  d2: "d2_at",
  out: "dout_at",
};

export const PDPA_VERSION = "1";

// hue ของแต่ละบ้าน (เหมือนของเดิม)
export const houseHue = (h: number) => (356 + (h - 1) * 30) % 360;

export type Student = {
  id: string;
  prefix: string;
  first: string;
  last: string;
  house: number;
  program: string;
  name: string;
  fullname: string;
  lineUrl?: string;
};

// แถวการเช็คชื่อในรูปแบบที่ฝั่ง client ใช้
export type AttRec = {
  d1: 0 | 1;
  d2: 0 | 1;
  out: 0 | 1;
  ts: { d1: number; d2: number; out: number };
};
export type AttMap = Record<string, AttRec>;

// แปลงแถวดิบจากตาราง attendance → AttRec
export function rowToRec(row: any): AttRec {
  const ms = (v: any) => (v ? new Date(v).getTime() : 0);
  return {
    d1: row.d1 ? 1 : 0,
    d2: row.d2 ? 1 : 0,
    out: row.dout ? 1 : 0,
    ts: { d1: ms(row.d1_at), d2: ms(row.d2_at), out: ms(row.dout_at) },
  };
}

export function makeName(prefix: string, first: string, last: string) {
  return ((prefix ? prefix + " " : "") + first + " " + last).trim();
}
