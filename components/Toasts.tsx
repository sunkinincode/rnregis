"use client";
import * as React from "react";
import { IconCheck, IconX } from "./icons";

export type Toast = { id: number; msg: string; kind: "" | "ok" | "err" };

export function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);
  const toast = React.useCallback((msg: string, kind: "" | "ok" | "err" = "") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return { toasts, toast };
}

export function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toaster" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className={"toast " + t.kind}>
          {t.kind === "ok" && <IconCheck size={18} />}
          {t.kind === "err" && <IconX size={18} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
