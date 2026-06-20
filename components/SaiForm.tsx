"use client";
import * as React from "react";
import Link from "next/link";
import { saiInfo, saiKey, SaiContact } from "@/lib/sai";
import { saiSubmit, saiLookup } from "@/lib/client";
import { IconHouse, IconCheck, IconSearch } from "./icons";

type Mode = "submit" | "lookup";

export default function SaiForm() {
  const [mode, setMode] = React.useState<Mode>("submit");

  React.useEffect(() => {
    document.body.dataset.role = "";
  }, []);

  return (
    <div className="stu">
      <div className="stu-bgwrap" aria-hidden="true">
        <div className="stu-blob b1" />
        <div className="stu-blob b2" />
        <div className="gem-facet f1" />
        <div className="gem-facet f2" />
        <span className="spark s1" /><span className="spark s2" /><span className="spark s3" />
        <span className="spark s4" /><span className="spark s5" /><span className="spark s6" />
      </div>

      <header className="topbar">
        <div className="brandmark">
          <span className="glyph" aria-hidden="true"><IconHouse size={19} /></span>
          <span className="brandmark-txt">
            <span className="t1">สายรหัส</span><br />
            <span className="t2">กิจกรรมรับน้อง · คณะวิทยาศาสตร์</span>
          </span>
        </div>
        <div className="topbar-spacer" />
        <Link className="staff-link" href="/">← ค้นหาบ้าน</Link>
      </header>

      <main className="stu-main">
        <div className="sai-wrap">
          <div className="sai-hero">
            <div className="sai-emoji" aria-hidden="true">🧬</div>
            <h1>สาย<span className="accent">รหัส</span></h1>
            <p>ฝากช่องทางติดต่อของคุณ หรือค้นหา<b>พี่/น้องรหัส</b>ในสายเดียวกัน</p>
          </div>

          <div className="sai-tabs" role="tablist">
            <button className={"sai-tab" + (mode === "submit" ? " active" : "")} onClick={() => setMode("submit")}>
              ฝากช่องทางติดต่อ
            </button>
            <button className={"sai-tab" + (mode === "lookup" ? " active" : "")} onClick={() => setMode("lookup")}>
              ดูสายรหัสของฉัน
            </button>
          </div>

          <div className="sai-card">
            {mode === "submit" ? <SubmitPanel /> : <LookupPanel goSubmit={() => setMode("submit")} />}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ───────────────── ฝากช่องทางติดต่อ ───────────────── */
function SubmitPanel() {
  const [studentId, setStudentId] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [name, setName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [done, setDone] = React.useState<{ label: string } | null>(null);

  const info = saiInfo(studentId);
  const idTyped = studentId.trim().length > 0;
  const idValid = !!info.role;
  const canSubmit = idValid && contact.trim() && consent && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      const res = await saiSubmit({ studentId: studentId.trim(), name: name.trim(), nickname: nickname.trim(), contact: contact.trim(), message: message.trim() });
      setDone({ label: res.label });
    } catch (e: any) {
      setBusy(false);
      const m = e?.message;
      if (m === "not-a-student") setErr("ไม่พบรหัสนี้ในรายชื่อนักศึกษาปี 1 — ตรวจสอบรหัสอีกครั้ง");
      else if (m === "bad-id") setErr("รหัสนักศึกษาไม่ถูกต้อง (ขึ้นต้น 66–69 และมี 10 หลัก)");
      else if (m === "missing-contact") setErr("กรุณากรอกช่องทางติดต่อ");
      else setErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  if (done) {
    return (
      <div className="sai-done">
        <div className="sai-done-ico"><IconCheck size={30} /></div>
        <h2>บันทึกเรียบร้อย!</h2>
        <p>ลงทะเบียนในฐานะ <b>{done.label}</b> แล้ว · แก้ไขได้โดยกรอกรหัสเดิมอีกครั้ง<br />ตอนนี้ดู "สายรหัสของฉัน" ได้แล้ว</p>
        <button className="btn btn-gold btn-block btn-lg" style={{ marginTop: 18 }} onClick={() => { setDone(null); setContact(""); }}>
          กรอกอีกคน
        </button>
      </div>
    );
  }

  return (
    <form className="sai-form" autoComplete="off" onSubmit={submit}>
      <div className="field">
        <label>รหัสนักศึกษา</label>
        <input type="text" inputMode="numeric" autoComplete="off" placeholder="เช่น 6910210001" value={studentId}
          onChange={(e) => { setStudentId(e.target.value.replace(/[^0-9]/g, "")); setErr(""); }} maxLength={10} />
        {idTyped && (idValid ? (
          <span className={"sai-badge " + info.role}>{info.role === "junior" ? "🌱" : "⭐"} {info.label}</span>
        ) : (
          <span className="sai-badge bad">รหัสต้องขึ้นต้น 66–69 และมี 10 หลัก</span>
        ))}
      </div>

      <div className="field">
        <label>ช่องทางติดต่อ</label>
        <div className="desc" style={{ margin: "0 0 8px" }}>Line ID / Instagram / เบอร์โทร — อันไหนก็ได้ที่สะดวก</div>
        <input type="text" placeholder="เช่น Line: myid หรือ IG: @myig" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
      </div>

      <div className="field">
        <label>ชื่อ-นามสกุล <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(ไม่บังคับ)</span></label>
        <input type="text" placeholder="ชื่อจริง นามสกุล" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>

      <div className="field">
        <label>ชื่อเล่น <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(ไม่บังคับ)</span></label>
        <input type="text" placeholder="ชื่อเล่น" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={60} />
      </div>

      <div className="field">
        <label>ข้อความถึงสายรหัส <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(ไม่บังคับ)</span></label>
        <textarea placeholder="อยากบอกอะไรพี่/น้องรหัสไหม…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
      </div>

      <label className="sai-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>ยินยอมให้เก็บช่องทางติดต่อนี้ไว้ใช้จับคู่สายรหัสในกิจกรรมรับน้องเท่านั้น</span>
      </label>

      {err && <div style={{ color: "var(--danger)", fontSize: ".88rem", fontWeight: 500 }}>{err}</div>}

      <button type="submit" className="btn btn-gold btn-block btn-lg" disabled={!canSubmit}>
        {busy ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
      </button>
    </form>
  );
}

/* ───────────────── ดูสายรหัสของฉัน ───────────────── */
function LookupPanel({ goSubmit }: { goSubmit: () => void }) {
  const [id, setId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "bad" | "notreg" | "fail" | "ok">("idle");
  const [rows, setRows] = React.useState<SaiContact[]>([]);
  const [key, setKey] = React.useState("");

  const info = saiInfo(id);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.role) { setState("bad"); return; }
    setBusy(true);
    try {
      const res = await saiLookup(id.trim());
      setRows(res.rows);
      setKey(res.saiKey);
      setState("ok");
    } catch (e: any) {
      if (e?.message === "not-registered") setState("notreg");
      else if (e?.message === "bad-id") setState("bad");
      else setState("fail");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sai-form">
      <div className="field">
        <label>รหัสนักศึกษาของคุณ</label>
        <div className="desc" style={{ margin: "0 0 8px" }}>ใส่รหัสตัวเอง เพื่อดูพี่/น้องในสายเดียวกัน (เลข 3 ตัวท้ายตรงกัน)</div>
        <form onSubmit={run} style={{ display: "flex", gap: 8 }}>
          <input type="text" inputMode="numeric" placeholder="เช่น 6910210001" value={id}
            onChange={(e) => { setId(e.target.value.replace(/[^0-9]/g, "")); setState("idle"); }} maxLength={10} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-gold" disabled={busy || !info.role} style={{ flex: "none" }}>
            <IconSearch size={18} /> {busy ? "…" : "ค้นหา"}
          </button>
        </form>
      </div>

      {state === "bad" && <div className="sai-note warn">รหัสไม่ถูกต้อง — ต้องขึ้นต้น 66–69 และมี 10 หลัก</div>}
      {state === "fail" && <div className="sai-note warn">ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง</div>}
      {state === "notreg" && (
        <div className="sai-note warn">
          ยังไม่พบข้อมูลของคุณในระบบ — ต้อง<b>ฝากช่องทางติดต่อของตัวเองก่อน</b> ถึงจะดูสายรหัสได้
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-gold" onClick={goSubmit}>ไปฝากช่องทางติดต่อ →</button>
          </div>
        </div>
      )}
      {state === "ok" && (
        rows.length === 0 ? (
          <div className="sai-note">ยังไม่มีใครในสายของคุณ (เลขท้าย <span className="sai-keychip">{key}</span>) ฝากช่องทางติดต่อไว้ ลองกลับมาดูใหม่ภายหลังนะ</div>
        ) : (
          <>
            <div className="sai-note">สายรหัสเลขท้าย <span className="sai-keychip">{key}</span> · พบ {rows.length} คน</div>
            <div className="sai-reslist">
              {rows.map((r) => (
                <div className="sai-resitem" key={r.student_id}>
                  <div className="res-top">
                    <span className={"sai-badge " + r.role} style={{ marginTop: 0 }}>
                      {r.role === "junior" ? "🌱 น้องรหัส" : "⭐ พี่รหัส"} · ปี {69 - r.year + 1}
                    </span>
                    {r.name && <span className="res-nm">{r.name}{r.nickname ? " (" + r.nickname + ")" : ""}</span>}
                    <span className="res-id tnum">{r.student_id}</span>
                  </div>
                  <div className="res-contact">📇 {r.contact}</div>
                  {r.message && <div className="res-msg">“{r.message}”</div>}
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
