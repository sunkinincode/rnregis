"use client";
import * as React from "react";
import Link from "next/link";
import { saiInfo, SAI_YEARS, SaiLine } from "@/lib/sai";
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
            {mode === "submit" ? <SubmitPanel /> : <LookupPanel />}
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
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [done, setDone] = React.useState<{ label: string } | null>(null);

  const info = saiInfo(studentId);
  const idTyped = studentId.trim().length > 0;
  const idValid = !!info.role;
  const canSubmit = idValid && !!contact.trim() && consent && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      const res = await saiSubmit({ studentId: studentId.trim(), contact: contact.trim() });
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
        <p>ลงในฐานะ <b>{done.label}</b> แล้ว · แก้ไขได้โดยกรอกรหัสเดิมอีกครั้ง<br />แตะแท็บ "ดูสายรหัสของฉัน" เพื่อดูทั้งสายได้เลย</p>
        <button className="btn btn-gold btn-block btn-lg" style={{ marginTop: 18 }} onClick={() => { setDone(null); setStudentId(""); setContact(""); setConsent(false); }}>
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
        <div className="desc" style={{ margin: "0 0 8px" }}>Instagram / Facebook / Line / เบอร์โทร — อันไหนก็ได้ที่สะดวก</div>
        <input type="text" placeholder="เช่น ig: myname หรือ Line: myid" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
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
function LookupPanel() {
  const [id, setId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "bad" | "fail" | "ok">("idle");
  const [line, setLine] = React.useState<SaiLine | null>(null);
  const [saiKey, setSaiKey] = React.useState("");
  const [you, setYou] = React.useState(0);

  const info = saiInfo(id);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info.role) { setState("bad"); return; }
    setBusy(true);
    try {
      const res = await saiLookup(id.trim());
      setLine(res.line);
      setSaiKey(res.saiKey);
      setYou(res.you);
      setState("ok");
    } catch (e: any) {
      setState(e?.message === "bad-id" ? "bad" : "fail");
    } finally {
      setBusy(false);
    }
  };

  const filled = line ? SAI_YEARS.filter((y) => (line as any)[y.col]).length : 0;

  return (
    <div className="sai-form">
      <div className="field">
        <label>รหัสนักศึกษาของ<b>ตัวคุณเอง</b></label>
        <div className="desc" style={{ margin: "0 0 8px" }}>
          ใส่รหัส<b>ของคุณ</b> (ไม่ใช่รหัสคนที่อยากหา) → ระบบจะแสดงช่องทางติดต่อของทุกคนใน<b>สายเดียวกัน</b> คือรหัสลงท้าย 3 ตัวเหมือนกัน
        </div>
        <form onSubmit={run} style={{ display: "flex", gap: 8 }}>
          <input type="text" inputMode="numeric" placeholder="เช่น 6910210001" value={id}
            onChange={(e) => { setId(e.target.value.replace(/[^0-9]/g, "")); setState("idle"); }} maxLength={10} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-gold" disabled={busy || !info.role} style={{ flex: "none" }}>
            <IconSearch size={18} /> {busy ? "…" : "ค้นหา"}
          </button>
        </form>
        {id.trim().length > 0 && (info.role ? (
          <div className="desc" style={{ marginTop: 8, color: "var(--ink-2)" }}>
            คุณคือ <b>{info.label}</b> — กดค้นหาเพื่อดู{info.role === "junior" ? "ช่องทางติดต่อของ" : ""}
            <b>{info.role === "junior" ? "พี่รหัส" : "น้องรหัส และพี่คนอื่น"}</b>ในสายของคุณ
          </div>
        ) : (
          <span className="sai-badge bad">รหัสต้องขึ้นต้น 66–69 และมี 10 หลัก</span>
        ))}
      </div>

      {state === "bad" && <div className="sai-note warn">รหัสไม่ถูกต้อง — ต้องขึ้นต้น 66–69 และมี 10 หลัก</div>}
      {state === "fail" && <div className="sai-note warn">ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง</div>}
      {state === "ok" && (
        !line || filled === 0 ? (
          <div className="sai-note">ยังไม่มีใครในสายของคุณ (เลขท้าย <span className="sai-keychip">{saiKey}</span>) กรอกช่องทางติดต่อ — ลองชวนกันมากรอก แล้วกลับมาดูใหม่นะ</div>
        ) : (
          <>
            <div className="sai-note">สายรหัสของคุณ (รหัสลงท้าย <span className="sai-keychip">{saiKey}</span>) — ช่องทางติดต่อทั้งสาย:</div>
            <div className="sai-reslist">
              {SAI_YEARS.map((y) => {
                const c = (line as any)[y.col] as string | null;
                const isYou = y.year === you;
                return (
                  <div className={"sai-resitem" + (isYou ? " me" : "") + (c ? "" : " empty")} key={y.year}>
                    <div className="res-top">
                      <span className={"sai-badge " + (y.year === 69 ? "junior" : "senior")} style={{ marginTop: 0 }}>
                        {y.emoji} {y.label}
                      </span>
                      {isYou && <span className="res-you">คุณ</span>}
                    </div>
                    {c ? <div className="res-contact">📇 {c}</div> : <div className="res-msg">— ยังไม่ได้กรอก —</div>}
                  </div>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}
