"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Database,
  type Field,
  type SelectOption,
  OPTION_COLORS,
} from "@/lib/db-types";
import { addOption, setCell, setOptionPhoto } from "@/lib/db-ops";
import { uploadImage } from "@/lib/cloudinary";

type Update = (fn: (db: Database) => Database) => void;

export function Avatar({
  option,
  size = 22,
}: {
  option: SelectOption;
  size?: number;
}) {
  const c = OPTION_COLORS[option.color] ?? OPTION_COLORS.gray;
  if (option.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={option.photo}
        alt={option.name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: c.bg,
        color: c.text,
        fontSize: size * 0.5,
      }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold uppercase"
    >
      {option.name.charAt(0) || "?"}
    </span>
  );
}

export function PersonChip({ option }: { option: SelectOption }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs font-medium dark:bg-slate-800">
      <Avatar option={option} size={18} />
      <span className="truncate">{option.name}</span>
    </span>
  );
}

export default function PersonCell({
  field,
  rowId,
  value,
  update,
}: {
  field: Field;
  rowId: string;
  value: string | null;
  update: Update;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const options = field.options ?? [];
  const current = options.find((o) => o.id === value) ?? null;
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(q.trim().toLowerCase())
  );
  const canCreate =
    q.trim().length > 0 &&
    !options.some((o) => o.name.toLowerCase() === q.trim().toLowerCase());

  async function handlePhoto(optionId: string, file: File) {
    setUploadingId(optionId);
    try {
      const res = await uploadImage(file);
      update((d) => setOptionPhoto(d, field.id, optionId, res.secure_url));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[26px] w-full items-center rounded px-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {current ? (
          <PersonChip option={current} />
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">
            Belum ada
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari / tambah orang…"
            className="mb-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {value && (
              <button
                onClick={() => {
                  update((d) => setCell(d, rowId, field.id, null));
                  setOpen(false);
                }}
                className="w-full rounded px-1.5 py-1 text-left text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕ Kosongkan
              </button>
            )}
            {filtered.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <button
                  onClick={() => {
                    update((d) => setCell(d, rowId, field.id, o.id));
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Avatar option={o} />
                  <span className="truncate text-sm">{o.name}</span>
                </button>
                <label
                  className="shrink-0 cursor-pointer rounded p-1 text-xs text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Unggah foto"
                >
                  {uploadingId === o.id ? "…" : "📷"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhoto(o.id, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ))}
            {canCreate && (
              <button
                onClick={() => {
                  update((d) => {
                    const { db: nd, option } = addOption(d, field.id, q.trim());
                    return setCell(nd, rowId, field.id, option.id);
                  });
                  setOpen(false);
                  setQ("");
                }}
                className="w-full rounded px-1.5 py-1 text-left text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ＋ Tambah orang “{q.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
