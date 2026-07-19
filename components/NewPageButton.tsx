"use client";

import { useEffect, useRef, useState } from "react";
import type { PageType } from "@/lib/types";

const ITEMS: { type: PageType; icon: string; label: string }[] = [
  { type: "document", icon: "📝", label: "Dokumen" },
  { type: "grid", icon: "🗂️", label: "Tabel (Grid)" },
  { type: "board", icon: "📋", label: "Board (Kanban)" },
];

export default function NewPageButton({
  onNew,
}: {
  onNew: (type: PageType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="text-base">＋</span> Halaman baru
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {ITEMS.map((it) => (
            <button
              key={it.type}
              onClick={() => {
                onNew(it.type);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
