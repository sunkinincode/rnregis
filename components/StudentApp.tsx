"use client";
import * as React from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Student, PDPA_VERSION, houseHue } from "@/lib/constants";
import { apiFind } from "@/lib/client";
import {
  IconSearch, IconX, IconChevron, IconHouse, IconLock, IconAlert, IconLine, IconShield, IconCheck,
} from "./icons";

const TUT_KEY = "regis.tutorial";
type Tut = { search?: 1; house?: 1; line?: 1; sai?: 1 };

export default function StudentApp() {
  const [pdpaOpen, setPdpaOpen] = React.useState(false);
  const [pdpaAgree, setPdpaAgree] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "empty" | "error" | "ok">("idle");
  const [errKind, setErrKind] = React.useState<"net" | "backend">("net");
  const [results, setResults] = React.useState<Student[]>([]);
  const [detail, setDetail] = React.useState<Student | null>(null);
  const [tut, setTut] = React.useState<Tut>({});
  const inputRef = React.useRef<HTMLInputElement>(null);
  const seqRef = React.useRef(0);
  const debRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // boot: role + PDPA + tutorial
  React.useEffect(() => {
    document.body.dataset.role = "";
    try {
      const t = JSON.parse(localStorage.getItem(TUT_KEY) || "{}");
      setTut(t || {});
    } catch {}
    const accepted = localStorage.getItem("regis.pdpa") === PDPA_VERSION;
    if (!accepted) setPdpaOpen(true);
    else setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  const markTut = React.useCallback((step: keyof Tut) => {
    setTut((prev) => {
      if (prev[step]) return prev;
      const next = { ...prev, [step]: 1 as const };
      try {
        localStorage.setItem(TUT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const runSearch = React.useCallback(
    async (value: string) => {
      const k = value.toLowerCase().replace(/\s+/g, "").trim();
      if (k.length < 2) {
        setStatus("idle");
        setResults([]);
        return;
      }
      const seq = ++seqRef.current;
      setStatus("loading");
      try {
        const list = await apiFind(value);
        if (seq !== seqRef.current) return;
        if (list.length) {
          markTut("search");
          setResults(list);
          setStatus("ok");
        } else {
          setResults([]);
          setStatus("empty");
        }
      } catch (e: any) {
        if (seq !== seqRef.current) return;
        setErrKind(e?.message === "no-backend" ? "backend" : "net");
        setStatus("error");
      }
    },
    [markTut],
  );

  const onInput = (value: string) => {
    setQ(value);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => runSearch(value), 240);
  };

  const onEnter = async () => {
    try {
      const list = await apiFind(q);
      if (list.length) openDetail(list[0]);
    } catch {}
  };

  const openDetail = (s: Student) => {
    markTut("house");
    setDetail(s);
    document.body.style.overflow = "hidden";
  };
  const closeDetail = () => {
    setDetail(null);
    document.body.style.overflow = "";
    inputRef.current?.focus();
  };

  React.useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detail]);

  const acceptPdpa = () => {
    try {
      localStorage.setItem("regis.pdpa", PDPA_VERSION);
    } catch {}
    setPdpaOpen(false);
    document.body.style.overflow = "";
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const doneCount = (["search", "house", "line"] as const).filter((s) => tut[s]).length;

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
            <span className="t1">ค้นหาบ้านของฉัน</span><br />
            <span className="t2">กิจกรรมรับน้อง · คณะวิทยาศาสตร์</span>
          </span>
        </div>
        <div className="topbar-spacer" />
        <Link className="staff-link" href="/staff"><IconLock size={15} /> เจ้าหน้าที่</Link>
      </header>

      <main className="stu-main">
        <div className="hero">
          <h1>น้อง<span className="accent">อยู่บ้านไหน?</span></h1>
          <p>พิมพ์รหัสนักศึกษา หรือชื่อ-นามสกุล เพื่อค้นหาบ้านและกลุ่มไลน์ของน้อง</p>
        </div>

        <div className="search">
          <div className="search-field">
            <IconSearch className="ico" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="เช่น 69102100XX หรือ สมหญิง ใจดี"
              aria-label="ค้นหารหัสหรือชื่อนักศึกษา"
              value={q}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEnter();
                }
              }}
            />
            {q && (
              <button className="search-clear" aria-label="ล้าง" onClick={() => { setQ(""); setStatus("idle"); setResults([]); inputRef.current?.focus(); }}>
                <IconX size={16} />
              </button>
            )}
          </div>
          {status === "idle" && (
            <p className="search-hint">พิมพ์อย่างน้อย 2 ตัวอักษร · ค้นหาได้ทั้งรหัสและชื่อ</p>
          )}
        </div>

        <div className="results" aria-live="polite">
          {status === "loading" && (
            <div className="emptystate"><div className="loader" aria-hidden="true" /><b>กำลังค้นหา…</b></div>
          )}
          {status === "error" && (
            <div className="emptystate">
              <IconAlert className="em-ico" />
              <b>{errKind === "backend" ? "ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล" : "ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง"}</b>
              <div>{errKind === "backend" ? "กรุณาติดต่อเจ้าหน้าที่" : "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"}</div>
            </div>
          )}
          {status === "empty" && (
            <div className="emptystate">
              <IconSearch className="em-ico" />
              <b>ไม่พบข้อมูล “{q}”</b>
              <div>ลองตรวจสอบรหัสนักศึกษาอีกครั้ง หรือค้นด้วยชื่อจริง</div>
            </div>
          )}
          {status === "ok" &&
            results.map((s, i) => (
              <button
                key={s.id}
                className="res-row"
                style={{ ["--hh" as any]: houseHue(s.house), animationDelay: Math.min(i * 22, 260) + "ms" }}
                onClick={() => openDetail(s)}
              >
                <span className="res-dot">{s.house}</span>
                <span className="res-name"><b>{s.name}</b><span className="tnum">{s.id}</span></span>
                <span className="res-house">บ้าน <b className="tnum">{s.house}</b></span>
                <IconChevron className="res-chev" />
              </button>
            ))}
        </div>

        <section className="guide" aria-label="ขั้นตอนการใช้งาน">
          <div className={"checklist" + (doneCount === 3 ? " all-done" : "")}>
            <div className="checklist-head">
              <h2>หาบ้านง่ายๆ 3 ขั้นตอน</h2>
              <span className="checklist-prog">{doneCount}/3</span>
            </div>
            <ol className="check-items">
              {[
                { step: "search", b: "ค้นหาตัวเอง", s: "พิมพ์รหัสนักศึกษา หรือชื่อ-นามสกุล ในช่องด้านบน" },
                { step: "house", b: "เปิดดูว่าอยู่บ้านไหน", s: "แตะที่ชื่อของน้อง เพื่อดูเลขบ้านประจำตัว" },
                { step: "line", b: "เข้ากลุ่มไลน์ประจำบ้าน", s: "กดปุ่มเข้ากลุ่มไลน์ หรือสแกน QR ในการ์ด" },
              ].map((it, i) => (
                <li key={it.step} className={"check-item" + ((tut as any)[it.step] ? " done" : "")}>
                  <span className="ci-box"><span className="ci-num">{i + 1}</span><IconCheck /></span>
                  <span className="ci-text"><b>{it.b}</b><span>{it.s}</span></span>
                </li>
              ))}
            </ol>
            <div className="checklist-done"><IconCheck /> ครบแล้ว! เจอบ้านและเข้ากลุ่มเรียบร้อย 🎉</div>
          </div>

          <Link
            className={"sairhad" + (tut.sai ? " done" : "")}
            href="/sai"
            onClick={() => markTut("sai")}
          >
            <span className="sai-ico" aria-hidden="true">🧬</span>
            <span className="sai-body">
              <b>พร้อมเล่นสายรหัส?</b>
              <span>ฝากช่องทางติดต่อไว้ ให้พี่รหัส (ปี 68/67/66) กับน้องรหัสตามหากันเจอ</span>
            </span>
            <span className="sai-cta">กรอกข้อมูล&nbsp;→</span>
          </Link>
        </section>
      </main>

      {detail && <Detail s={detail} onClose={closeDetail} onLine={() => markTut("line")} />}
      {pdpaOpen && (
        <Pdpa agree={pdpaAgree} setAgree={setPdpaAgree} onAccept={acceptPdpa} />
      )}
    </div>
  );
}

function Detail({ s, onClose, onLine }: { s: Student; onClose: () => void; onLine: () => void }) {
  const hue = houseHue(s.house);
  const lineUrl = s.lineUrl || "";
  return (
    <div className="detail-overlay" style={{ ["--hh" as any]: hue }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="detail" role="dialog" aria-modal="true" aria-label="ผลการค้นหาบ้าน">
        <div className="detail-hero">
          <div className="detail-grab" />
          <button className="detail-close" aria-label="ปิด" onClick={onClose}><IconX size={18} /></button>
          <div className="detail-eyebrow">น้องอยู่</div>
          <div className="detail-house"><small>บ้าน</small><span className="tnum">{s.house}</span></div>
        </div>
        <div className="detail-body">
          <div className="idcard">
            <div className="nm">{s.name}</div>
            <div className="meta">{s.program}</div>
            <div className="sid tnum">{s.id}</div>
          </div>
          <div className="line-box">
            <h3>เข้ากลุ่มไลน์บ้าน {s.house}</h3>
            <div className="sub">รวมเพื่อนบ้านเดียวกันไว้ที่นี่</div>
            {lineUrl ? (
              <>
                <div className="qr-frame"><QRCodeSVG value={lineUrl} size={164} level="M" /></div>
                <div className="scan-cap">สแกน QR หรือกดปุ่มด้านล่างเพื่อเข้ากลุ่ม</div>
                <a className="btn btn-line btn-block btn-lg" href={lineUrl} target="_blank" rel="noopener" onClick={onLine}>
                  <IconLine /> เข้ากลุ่มไลน์
                </a>
              </>
            ) : (
              <div className="scan-cap">ยังไม่มีลิงก์กลุ่มไลน์สำหรับบ้านนี้</div>
            )}
          </div>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 14 }} onClick={onClose}>ค้นหาคนอื่น</button>
        </div>
      </div>
    </div>
  );
}

function Pdpa({ agree, setAgree, onAccept }: { agree: boolean; setAgree: (v: boolean) => void; onAccept: () => void }) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
  }, []);
  const items = [
    ["วัตถุประสงค์:", " ใช้ค้นหาบ้านและกลุ่มกิจกรรมของนักศึกษาใหม่ในกิจกรรมรับน้องเท่านั้น"],
    ["ข้อมูลที่ใช้:", " ชื่อ-นามสกุล รหัสนักศึกษา บ้านที่สังกัด และหลักสูตร"],
    ["การจัดเก็บ:", " ข้อมูลถูกเก็บแยกในฐานข้อมูลของผู้จัดกิจกรรม ไม่ได้ฝังในซอร์สโค้ดของเว็บไซต์"],
    ["การเปิดเผย:", " จะไม่เปิดเผยต่อบุคคลภายนอก และไม่นำไปใช้นอกเหนือจากกิจกรรมรับน้อง"],
    ["ระยะเวลา:", " ใช้เฉพาะช่วงกิจกรรมรับน้อง เมื่อสิ้นสุดกิจกรรมจะยกเลิกการใช้งานข้อมูล"],
  ];
  return (
    <div className="pdpa">
      <div className="pdpa-card" role="dialog" aria-modal="true" aria-label="ความยินยอมข้อมูลส่วนบุคคล">
        <div className="pdpa-ico"><IconShield size={28} /></div>
        <h2>การคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h2>
        <p className="lead">ก่อนใช้งานระบบค้นหาบ้านกิจกรรมรับน้อง โปรดอ่านและให้ความยินยอมในการประมวลผลข้อมูลส่วนบุคคลตามรายละเอียดด้านล่าง</p>
        <ul className="pdpa-list">
          {items.map((it, i) => (
            <li key={i}><IconCheck size={17} /><span><b>{it[0]}</b>{it[1]}</span></li>
          ))}
        </ul>
        <label className="pdpa-consent">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>ฉันได้อ่านและ<b style={{ color: "var(--gem-gold)" }}>ยินยอม</b>ให้ประมวลผลข้อมูลส่วนบุคคลตามวัตถุประสงค์ข้างต้น</span>
        </label>
        <button className="btn btn-gold btn-block btn-lg" style={{ marginTop: 16 }} disabled={!agree} onClick={onAccept}>
          ยอมรับและเข้าใช้งาน
        </button>
        <p className="pdpa-foot">หากไม่ยินยอม กรุณาปิดหน้าเว็บนี้</p>
      </div>
    </div>
  );
}
