"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Student, AttMap, AttRec, CHECKPOINTS, SLOTS, SlotId, houseHue, rowToRec,
} from "@/lib/constants";
import { staffLogin, staffLogout, staffToken, staffList, staffMark } from "@/lib/client";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { fmtTs, isComplete, exportCsv } from "@/lib/format";
import { useToasts, Toaster } from "./Toasts";
import {
  IconLock, IconEye, IconLogout, IconBarcode, IconInfo, IconSearch, IconDownload, IconCheck, IconX, IconAlert,
} from "./icons";

const norm = (s: string) => (s || "").toString().toLowerCase().replace(/\s+/g, "").trim();
type SyncState = "online" | "offline" | "syncing";

export default function StaffApp() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"checking" | "gate" | "in">("checking");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [att, setAtt] = React.useState<AttMap>({});
  const [sync, setSync] = React.useState<SyncState>("syncing");
  const { toasts, toast } = useToasts();
  const tokenRef = React.useRef("");

  // ลองใช้ session cookie ที่มีอยู่ (เปิดหน้าใหม่)
  React.useEffect(() => {
    document.body.dataset.role = "staff";
    (async () => {
      try {
        const token = await staffToken();
        tokenRef.current = token;
        await enter(token);
      } catch {
        setPhase("gate");
      }
    })();
    return () => {
      document.body.dataset.role = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = React.useCallback(async () => {
    const { students, att } = await staffList();
    setStudents(students);
    setAtt(att);
  }, []);

  // เข้าสู่คอนโซล: โหลดข้อมูล + subscribe realtime + ตั้ง backup refresh
  const enter = React.useCallback(
    async (token: string) => {
      await loadData();
      setPhase("in");
      const sb = supabaseBrowser();
      sb.realtime.setAuth(token);
      const ch = sb
        .channel("attendance-rt")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attendance" },
          (payload: any) => {
            const row = payload.new && payload.new.student_id ? payload.new : payload.old;
            if (!row || !row.student_id) return;
            const id = String(row.student_id);
            if (payload.eventType === "DELETE") {
              setAtt((a) => {
                const n = { ...a };
                delete n[id];
                return n;
              });
            } else {
              setAtt((a) => ({ ...a, [id]: rowToRec(row) }));
            }
          },
        )
        .subscribe((st: string) => {
          setSync(st === "SUBSCRIBED" ? "online" : st === "CHANNEL_ERROR" || st === "TIMED_OUT" ? "offline" : "syncing");
        });

      // backup: ดึงข้อมูลซ้ำทุก 30 วิ (กันกรณี event หล่น) + รีเฟรช token ทุก 5 ชม.
      const poll = setInterval(() => {
        loadData().catch(() => {});
      }, 30000);
      const refresh = setInterval(async () => {
        try {
          const t = await staffToken();
          tokenRef.current = t;
          sb.realtime.setAuth(t);
        } catch {}
      }, 5 * 60 * 60 * 1000);

      cleanupRef.current = () => {
        clearInterval(poll);
        clearInterval(refresh);
        sb.removeChannel(ch);
      };
    },
    [loadData],
  );
  const cleanupRef = React.useRef<(() => void) | undefined>(undefined);
  React.useEffect(() => () => cleanupRef.current?.(), []);

  const onLogout = async () => {
    cleanupRef.current?.();
    tokenRef.current = "";
    try {
      await staffLogout();
    } catch {}
    setStudents([]);
    setAtt({});
    document.body.dataset.role = "";
    router.push("/");
  };

  // ── optimistic mark ──
  const mark = React.useCallback(
    async (id: string, slot: SlotId, val: boolean) => {
      const prev = att[id];
      setAtt((a) => {
        const cur: AttRec = a[id] || { d1: 0, d2: 0, out: 0, ts: { d1: 0, d2: 0, out: 0 } };
        const next: AttRec = { ...cur, ts: { ...cur.ts } };
        next[slot] = val ? 1 : 0;
        next.ts[slot] = val ? Date.now() : 0;
        return { ...a, [id]: next };
      });
      try {
        const rec = await staffMark(id, slot, val);
        setAtt((a) => ({ ...a, [id]: rec }));
        setSync("online");
      } catch (e: any) {
        // ย้อนกลับถ้าบันทึกไม่สำเร็จ
        setAtt((a) => {
          const n = { ...a };
          if (prev) n[id] = prev;
          else delete n[id];
          return n;
        });
        if (e?.message === "unauthorized") {
          toast("เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่", "err");
          setPhase("gate");
        } else {
          setSync("offline");
          toast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "err");
        }
      }
    },
    [att, toast],
  );

  if (phase === "checking") {
    return (
      <div className="gate">
        <div className="gate-card"><div className="loader" /><p>กำลังตรวจสอบสิทธิ์…</p></div>
      </div>
    );
  }
  if (phase === "gate") {
    return <Gate onSuccess={async (token) => { tokenRef.current = token; await enter(token); }} />;
  }
  return (
    <Console
      students={students}
      att={att}
      sync={sync}
      mark={mark}
      onLogout={onLogout}
      toast={toast}
      toasts={toasts}
    />
  );
}

/* ───────────────────────── PIN GATE ───────────────────────── */
function Gate({ onSuccess }: { onSuccess: (token: string) => Promise<void> }) {
  const router = useRouter();
  const [val, setVal] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [shake, setShake] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    setTimeout(() => ref.current?.focus(), 60);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val) {
      ref.current?.focus();
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const token = await staffLogin(val);
      await onSuccess(token);
    } catch (e: any) {
      setBusy(false);
      if (e?.message === "unauthorized") {
        setErr("รหัสผ่านไม่ถูกต้อง");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        ref.current?.select();
      } else {
        setErr("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    }
  };

  return (
    <div className={"gate" + (shake ? " err" : "")}>
      <div className="gate-card">
        <div className="gate-ico"><IconLock size={30} /></div>
        <h2>หน่วยลงทะเบียน</h2>
        <p>กรอกรหัสผ่านเพื่อเข้าสู่ระบบเช็คชื่อกิจกรรม</p>
        <form className="gate-form" autoComplete="off" onSubmit={submit}>
          <div className="gate-input">
            <input
              ref={ref}
              type={show ? "text" : "password"}
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="รหัสผ่านเจ้าหน้าที่"
              aria-label="รหัสผ่านเจ้าหน้าที่"
              value={val}
              onChange={(e) => {
                setVal(e.target.value);
                setErr("");
              }}
            />
            <button type="button" className="gate-eye" aria-label="แสดง/ซ่อนรหัสผ่าน" aria-pressed={show} onClick={() => { setShow((s) => !s); ref.current?.focus(); }}>
              <IconEye off={show} />
            </button>
          </div>
          <div className="gate-err">{err}</div>
          <button type="submit" className="gate-submit" disabled={busy}>
            {busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
        <a className="gate-back" href="/" onClick={(e) => { e.preventDefault(); router.push("/"); }}>← กลับหน้าค้นหาบ้าน</a>
      </div>
    </div>
  );
}

/* ───────────────────────── CONSOLE ───────────────────────── */
function Console({
  students, att, sync, mark, onLogout, toast, toasts,
}: {
  students: Student[];
  att: AttMap;
  sync: SyncState;
  mark: (id: string, slot: SlotId, val: boolean) => void;
  onLogout: () => void;
  toast: (m: string, k?: "" | "ok" | "err") => void;
  toasts: any[];
}) {
  const [activeCP, setActiveCP] = React.useState<SlotId>("d1");
  const [scan, setScan] = React.useState("");
  const [feedback, setFeedback] = React.useState<React.ReactNode>(null);
  const [fltQ, setFltQ] = React.useState("");
  const [fltHouse, setFltHouse] = React.useState("");
  const [fltStatus, setFltStatus] = React.useState("");
  const scanRef = React.useRef<HTMLInputElement>(null);

  const enriched = React.useMemo(
    () => students.map((s) => ({ ...s, _k: norm(s.id + s.first + s.last), _kn: norm(s.fullname) })),
    [students],
  );
  const byId = React.useMemo(() => new Map(enriched.map((s) => [s.id, s])), [enriched]);

  const has = (id: string, slot: SlotId) => !!(att[id] && att[id][slot]);
  const tsOf = (id: string, slot: SlotId) => (att[id] && att[id].ts ? att[id].ts[slot] : 0);
  const countSlot = (slot: SlotId) => students.reduce((n, s) => n + (has(s.id, slot) ? 1 : 0), 0);
  const countComplete = students.reduce((n, s) => n + (isComplete(att, s.id) ? 1 : 0), 0);

  const localSearch = (q: string, limit = 6) => {
    const k = norm(q);
    if (k.length < 2) return [];
    const exact: any[] = [], starts: any[] = [], incl: any[] = [];
    for (const s of enriched) {
      if (s.id === k || s._kn === k) exact.push(s);
      else if (s.id.startsWith(k) || s._kn.startsWith(k)) starts.push(s);
      else if (s._k.includes(k) || s._kn.includes(k)) incl.push(s);
      if (exact.length + starts.length + incl.length > limit + 40) break;
    }
    return [...exact, ...starts, ...incl].slice(0, limit);
  };

  const handleScan = (raw: string) => {
    const q = (raw || "").trim();
    if (!q) return;
    let s: any = byId.get(q) || byId.get(q.replace(/\D/g, ""));
    if (!s) {
      const list = localSearch(q, 6);
      if (list.length === 1) s = list[0];
      else if (list.length > 1) {
        setFeedback(
          <div className="feedback warn">
            <div className="fb-ico"><IconAlert size={22} /></div>
            <div className="fb-body">
              <div className="fb-name">พบหลายคน — เลือกให้ถูกต้อง</div>
              <div className="fb-chips">
                {list.map((x) => (
                  <button key={x.id} className="minichip miss" style={{ cursor: "pointer" }} onClick={() => { setScan(x.id); handleScan(x.id); }}>
                    {x.fullname} · {x.id}
                  </button>
                ))}
              </div>
            </div>
          </div>,
        );
        scanRef.current?.select();
        return;
      }
    }
    if (!s) {
      setFeedback(
        <div className="feedback err">
          <div className="fb-ico"><IconX size={22} /></div>
          <div className="fb-body"><div className="fb-name">ไม่พบ “{q}”</div><div className="fb-sub">ตรวจสอบรหัสนักศึกษา หรือค้นด้วยชื่อ</div></div>
        </div>,
      );
      scanRef.current?.select();
      return;
    }
    const already = has(s.id, activeCP);
    mark(s.id, activeCP, true);
    const cpName = CHECKPOINTS.find((c) => c.id === activeCP)!.v;
    const complete = SLOTS.every((slot) => (slot === activeCP ? true : has(s.id, slot)));
    setFeedback(
      <div className="feedback ok">
        <div className="fb-ico"><IconCheck size={24} /></div>
        <div className="fb-body">
          <div className="fb-name">{s.name} <span style={{ color: "var(--ink-3)", fontWeight: 600 }}>· บ้าน {s.house}</span></div>
          <div className="fb-sub">
            {already ? "เช็คชื่อช่วงนี้ไว้แล้ว" : "เช็คชื่อ " + cpName + " เรียบร้อย"}
            {complete && <> — <b>ครบ 3 ช่วง ได้ชั่วโมงกิจกรรม 🎉</b></>}
          </div>
          <div className="fb-chips">
            {SLOTS.map((slot) => {
              const ok = slot === activeCP ? true : has(s.id, slot);
              const c = CHECKPOINTS.find((x) => x.id === slot)!;
              return <span key={slot} className={"minichip " + (ok ? "has" : "miss")}>{ok ? "✓" : "○"} {c.v}</span>;
            })}
          </div>
        </div>
      </div>,
    );
    if (navigator.vibrate) navigator.vibrate(complete ? [40, 40, 40] : 25);
    setScan("");
    scanRef.current?.focus();
  };

  const filtered = React.useMemo(() => {
    const q = norm(fltQ), h = fltHouse, st = fltStatus;
    return enriched.filter((s) => {
      if (h && s.house !== +h) return false;
      if (q && !(s._k.includes(q) || s._kn.includes(q))) return false;
      if (st === "ok" && !isComplete(att, s.id)) return false;
      if (st === "no" && isComplete(att, s.id)) return false;
      return true;
    });
  }, [enriched, fltQ, fltHouse, fltStatus, att]);

  const MAX = 400;
  const shown = filtered.slice(0, MAX);
  const total = students.length;
  const pct = total ? Math.round((countComplete / total) * 100) : 0;
  const syncLabel = sync === "online" ? "ซิงก์เรียลไทม์" : sync === "syncing" ? "กำลังเชื่อมต่อ…" : "ออฟไลน์";

  return (
    <div className="staff">
      <header className="staff-bar">
        <div className="title"><b>หน่วยลงทะเบียน</b><span>เช็คชื่อกิจกรรมรับน้อง · {total} คน</span></div>
        <div className="sp" />
        <div className={"sync-pill " + (sync === "online" ? "online" : sync === "syncing" ? "syncing" : "offline")}>
          <span className="dot" /><span className="lbl">{syncLabel}</span>
        </div>
        <button className="iconbtn" title="ออกจากระบบ" aria-label="ออกจากระบบ" onClick={onLogout}><IconLogout size={19} /></button>
      </header>

      <main className="staff-main">
        <section>
          <div className="section-label">1 · เลือกช่วงที่กำลังเช็คชื่อ</div>
          <div className="checkpoints">
            {CHECKPOINTS.map((c) => (
              <button key={c.id} className={"cp" + (c.id === activeCP ? " active" : "")} onClick={() => { setActiveCP(c.id); scanRef.current?.focus(); }}>
                <div className="cp-k">{c.k}{c.date ? " · " + c.date : ""}</div>
                <div className="cp-v">{c.v}</div>
                <div className="cp-n">มาแล้ว <b className="tnum">{countSlot(c.id)}</b></div>
              </button>
            ))}
          </div>
        </section>

        <section className="scanpanel">
          <div className="section-label">2 · สแกนบาร์โค้ด หรือพิมพ์รหัส/ชื่อ แล้วกด Enter</div>
          <div className="scan-field">
            <IconBarcode className="ico" />
            <input
              ref={scanRef}
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="รอสแกน… หรือพิมพ์รหัสนักศึกษา"
              aria-label="สแกนหรือพิมพ์รหัสนักศึกษา"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(scan); } }}
            />
            <button className="go" onClick={() => handleScan(scan)}>เช็คชื่อ</button>
          </div>
          <div className="scan-note">
            <IconInfo size={15} />
            เครื่องอ่านบาร์โค้ดจะกรอกรหัสและกด Enter ให้อัตโนมัติ — ระบบจะเช็คชื่อในช่วงที่เลือกไว้ทันที
          </div>
          <div>{feedback}</div>
        </section>

        <section>
          <div className="section-label">ภาพรวม</div>
          <div className="stats">
            <div className="stat hl">
              <div className="k">ครบ 3 ช่วง (ได้ชั่วโมง)</div>
              <div className="v tnum">{countComplete} <small>/ {total}</small></div>
              <div className="bar"><i style={{ width: pct + "%" }} /></div>
            </div>
            <div className="stat"><div className="k">{CHECKPOINTS[0].v} · {CHECKPOINTS[0].date}</div><div className="v tnum">{countSlot("d1")}</div></div>
            <div className="stat"><div className="k">{CHECKPOINTS[1].v} · {CHECKPOINTS[1].date}</div><div className="v tnum">{countSlot("d2")}</div></div>
            <div className="stat"><div className="k">{CHECKPOINTS[2].v}</div><div className="v tnum">{countSlot("out")}</div></div>
          </div>
        </section>

        <section className="tablewrap">
          <div className="table-tools">
            <label className="tfilter">
              <IconSearch className="ico" />
              <input type="search" placeholder="ค้นหาในรายชื่อ (รหัส/ชื่อ)" autoComplete="off" value={fltQ} onChange={(e) => setFltQ(e.target.value)} />
            </label>
            <select className="sel" value={fltHouse} onChange={(e) => setFltHouse(e.target.value)}>
              <option value="">ทุกบ้าน</option>
              {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>บ้าน {i + 1}</option>)}
            </select>
            <select className="sel" value={fltStatus} onChange={(e) => setFltStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="ok">ครบ 3 ช่วง</option>
              <option value="no">ยังไม่ครบ</option>
            </select>
            <button className="btn btn-ghost" onClick={() => { exportCsv(students, att); toast("ดาวน์โหลดไฟล์ CSV แล้ว (" + total + " รายชื่อ)", "ok"); }}>
              <IconDownload size={17} /> Export CSV
            </button>
          </div>
          <div className="table-scroll">
            <table className="att">
              <thead>
                <tr>
                  <th className="rownum">#</th>
                  <th>นักศึกษา</th>
                  <th className="c">บ้าน</th>
                  <th className="c">{CHECKPOINTS[0].v}<br /><small style={{ fontWeight: 500, color: "var(--ink-3)" }}>{CHECKPOINTS[0].date}</small></th>
                  <th className="c">{CHECKPOINTS[1].v}<br /><small style={{ fontWeight: 500, color: "var(--ink-3)" }}>{CHECKPOINTS[1].date}</small></th>
                  <th className="c">{CHECKPOINTS[2].v}</th>
                  <th className="c">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s, i) => {
                  const complete = isComplete(att, s.id);
                  return (
                    <tr key={s.id} className={complete ? "complete" : ""}>
                      <td className="rownum tnum">{i + 1}</td>
                      <td className="t-name"><b>{s.fullname}</b><span className="tnum">{s.id} · {s.program}</span></td>
                      <td className="c"><span className="hdot" style={{ ["--hh" as any]: houseHue(s.house) }}>{s.house}</span></td>
                      {SLOTS.map((slot) => {
                        const on = has(s.id, slot);
                        const ts = on ? tsOf(s.id, slot) : 0;
                        return (
                          <td key={slot} className="c">
                            <button
                              className={"check" + (on ? " on" : "")}
                              title={ts ? "เช็คเมื่อ " + fmtTs(ts) : undefined}
                              aria-label={on ? "ยกเลิก" : "เช็คชื่อ"}
                              onClick={() => mark(s.id, slot, !on)}
                            >
                              <IconCheck />
                            </button>
                          </td>
                        );
                      })}
                      <td className="c"><span className={"statustag " + (complete ? "ok" : "no")}>{complete ? "ครบ ✓" : "—"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            แสดง {shown.length}{filtered.length > MAX ? " จาก " + filtered.length : ""} รายชื่อ
            {filtered.length > MAX && <> · <span style={{ color: "var(--ink-3)" }}>พิมพ์ค้นหาเพื่อจำกัดผลลัพธ์</span></>}
            {filtered.length === 0 && (
              <span className="table-empty">{total === 0 ? "กำลังโหลดรายชื่อ…" : "ไม่พบรายชื่อตามเงื่อนไข"}</span>
            )}
          </div>
        </section>
      </main>
      <Toaster toasts={toasts} />
    </div>
  );
}
