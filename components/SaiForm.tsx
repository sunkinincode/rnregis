"use client";
import * as React from "react";
import Link from "next/link";
import { saiInfo } from "@/lib/sai";
import { saiSubmit } from "@/lib/client";
import { IconHouse, IconCheck } from "./icons";

export default function SaiForm() {
  const [studentId, setStudentId] = React.useState("");
  const [name, setName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [done, setDone] = React.useState<{ label: string } | null>(null);

  React.useEffect(() => {
    document.body.dataset.role = "";
  }, []);

  const info = saiInfo(studentId);
  const idTyped = studentId.trim().length > 0;
  const idValid = !!info.role;
  const canSubmit = idValid && name.trim() && contact.trim() && consent && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      const res = await saiSubmit({
        studentId: studentId.trim(),
        name: name.trim(),
        nickname: nickname.trim(),
        contact: contact.trim(),
        message: message.trim(),
      });
      setDone({ label: res.label });
    } catch (e: any) {
      setBusy(false);
      const m = e?.message;
      if (m === "not-a-student") setErr("ไม่พบรหัสนี้ในรายชื่อนักศึกษาปี 1 — ตรวจสอบรหัสอีกครั้ง");
      else if (m === "bad-id") setErr("รหัสนักศึกษาไม่ถูกต้อง (ต้องขึ้นต้นด้วย 66–69 และมี 10 หลัก)");
      else if (m === "missing-fields") setErr("กรุณากรอกชื่อและช่องทางติดต่อ");
      else setErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

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
          <div className="sai-card">
            {done ? (
              <div className="sai-done">
                <div className="sai-done-ico"><IconCheck size={30} /></div>
                <h2>บันทึกเรียบร้อย!</h2>
                <p>
                  ลงทะเบียนในฐานะ <b>{done.label}</b> แล้ว<br />
                  ถ้าต้องการแก้ไข กรอกรหัสเดิมอีกครั้งได้เลย ข้อมูลจะอัปเดตทับให้
                </p>
                <Link className="btn btn-gold btn-block btn-lg" style={{ marginTop: 18 }} href="/">
                  กลับหน้าค้นหาบ้าน
                </Link>
              </div>
            ) : (
              <>
                <div className="sai-hero">
                  <div className="sai-emoji" aria-hidden="true">🧬</div>
                  <h1>ฝากช่องทางติดต่อสายรหัส</h1>
                  <p>กรอกได้ทั้ง <b>น้องรหัส (ปี 69)</b> และ <b>พี่รหัส (ปี 68/67/66)</b> เพื่อให้สายรหัสตามหากันเจอ</p>
                </div>

                <form className="sai-form" autoComplete="off" onSubmit={submit}>
                  <div className="field">
                    <label>รหัสนักศึกษา</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="เช่น 6910210001"
                      value={studentId}
                      onChange={(e) => { setStudentId(e.target.value.replace(/[^0-9]/g, "")); setErr(""); }}
                      maxLength={10}
                    />
                    {idTyped && (
                      idValid ? (
                        <span className={"sai-badge " + info.role}>
                          {info.role === "junior" ? "🌱" : "⭐"} {info.label}
                        </span>
                      ) : (
                        <span className="sai-badge bad">รหัสต้องขึ้นต้น 66–69 และมี 10 หลัก</span>
                      )
                    )}
                  </div>

                  <div className="field">
                    <label>ชื่อ-นามสกุล</label>
                    <input type="text" placeholder="ชื่อจริง นามสกุล" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
                  </div>

                  <div className="field">
                    <label>ชื่อเล่น <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(ไม่บังคับ)</span></label>
                    <input type="text" placeholder="ชื่อเล่น" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={60} />
                  </div>

                  <div className="field">
                    <label>ช่องทางติดต่อ</label>
                    <div className="desc" style={{ margin: "0 0 8px" }}>Line ID / Instagram / เบอร์โทร — อันไหนก็ได้ที่สะดวก</div>
                    <input type="text" placeholder="เช่น Line: myid หรือ IG: @myig" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
