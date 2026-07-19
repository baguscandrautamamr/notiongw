"use client";

import { useEffect, useRef, useState } from "react";
import { OPTION_COLORS, type SelectOption } from "@/lib/db-types";

export function OptionChip({ option }: { option: SelectOption }) {
  const c = OPTION_COLORS[option.color] ?? OPTION_COLORS.gray;
  return (
    <span
      className="inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {option.name}
    </span>
  );
}

export default function SelectCell({
  options,
  value,
  onSelect,
  onCreate,
  placeholder = "Kosong",
}: {
  options: SelectOption[];
  value: string | null;
  onSelect: (optionId: string | null) => void;
  onCreate: (name: string) => void; // parent adds the option AND selects it
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = options.find((o) => o.id === value) ?? null;
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(q.trim().toLowerCase())
  );
  const canCreate =
    q.trim().length > 0 &&
    !options.some((o) => o.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[26px] w-full items-center rounded px-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {current ? (
          <OptionChip option={current} />
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">
            {placeholder}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari / buat opsi…"
            className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {value && (
              <button
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="w-full rounded px-1.5 py-1 text-left text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕ Kosongkan
              </button>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onSelect(o.id);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center rounded px-1.5 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <OptionChip option={o} />
              </button>
            ))}
            {canCreate && (
              <button
                onClick={() => {
                  onCreate(q.trim());
                  setOpen(false);
                  setQ("");
                }}
                className="w-full rounded px-1.5 py-1 text-left text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ＋ Buat “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
