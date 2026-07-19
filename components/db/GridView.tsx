"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Database,
  type Field,
  type FieldType,
} from "@/lib/db-types";
import {
  addField,
  addRow,
  deleteField,
  deleteRow,
  setGroupBy,
  updateField,
} from "@/lib/db-ops";
import CellEditor from "@/components/db/CellEditor";

const TYPE_META: Record<FieldType, { icon: string; label: string }> = {
  text: { icon: "Aa", label: "Teks" },
  number: { icon: "#", label: "Angka" },
  select: { icon: "◉", label: "Pilihan" },
  checkbox: { icon: "☑", label: "Centang" },
  date: { icon: "📅", label: "Tanggal" },
  progress: { icon: "▰", label: "Progres" },
};

type Update = (fn: (db: Database) => Database) => void;

function FieldHeader({
  field,
  isGroup,
  update,
}: {
  field: Field;
  isGroup: boolean;
  update: Update;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(field.name);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setName(field.name), [field.name]);
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
        className="flex w-full items-center gap-1.5 px-2 py-2 text-left text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <span className="text-slate-400">{TYPE_META[field.type].icon}</span>
        <span className="truncate">{field.name}</span>
        {isGroup && <span className="text-brand-500" title="Grup Board">◧</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => update((db) => updateField(db, field.id, { name }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update((db) => updateField(db, field.id, { name }));
                setOpen(false);
              }
            }}
            className="mb-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="px-1 py-1 text-[11px] uppercase text-slate-400">
            {TYPE_META[field.type].label}
          </div>
          {field.type === "select" && !isGroup && (
            <button
              onClick={() => {
                update((db) => setGroupBy(db, field.id));
                setOpen(false);
              }}
              className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ◧ Jadikan grup Board
            </button>
          )}
          <button
            onClick={() => {
              update((db) => deleteField(db, field.id));
              setOpen(false);
            }}
            className="w-full rounded px-2 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            🗑️ Hapus kolom
          </button>
        </div>
      )}
    </div>
  );
}

function AddColumn({ update }: { update: Update }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const types: FieldType[] = [
    "text",
    "number",
    "select",
    "checkbox",
    "date",
    "progress",
  ];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-full w-10 items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Tambah kolom"
      >
        ＋
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => {
                update((db) => addField(db, t));
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="w-4 text-center text-slate-400">
                {TYPE_META[t].icon}
              </span>
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GridView({
  db,
  update,
}: {
  db: Database;
  update: Update;
}) {
  const rows = [...db.rows].sort((a, b) => a.position - b.position);

  const cell = (fieldId: string, rowId: string, field: Field) => {
    const value = db.rows.find((r) => r.id === rowId)?.cells[fieldId];
    return (
      <CellEditor field={field} rowId={rowId} value={value} update={update} />
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        {/* Header */}
        <div className="flex border-y border-slate-200 dark:border-slate-800">
          <div className="w-8 shrink-0 border-r border-slate-200 dark:border-slate-800" />
          {db.fields.map((f) => (
            <div
              key={f.id}
              className="w-48 shrink-0 border-r border-slate-200 dark:border-slate-800"
            >
              <FieldHeader
                field={f}
                isGroup={db.groupByFieldId === f.id}
                update={update}
              />
            </div>
          ))}
          <AddColumn update={update} />
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div
            key={row.id}
            className="group flex border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
          >
            <div className="flex w-8 shrink-0 items-center justify-center border-r border-slate-100 dark:border-slate-800/60">
              <button
                onClick={() => update((d) => deleteRow(d, row.id))}
                className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                title="Hapus baris"
              >
                🗑️
              </button>
            </div>
            {db.fields.map((f) => (
              <div
                key={f.id}
                className="flex w-48 shrink-0 items-center border-r border-slate-100 px-2 py-1.5 dark:border-slate-800/60"
              >
                {cell(f.id, row.id, f)}
              </div>
            ))}
            <div className="w-10 shrink-0" />
          </div>
        ))}

        {/* Add row */}
        <button
          onClick={() => update((d) => addRow(d))}
          className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
        >
          ＋ Baris baru
        </button>
      </div>
    </div>
  );
}
