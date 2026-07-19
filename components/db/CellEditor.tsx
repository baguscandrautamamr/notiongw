"use client";

import { useState } from "react";
import {
  type Database,
  type Field,
  asChecklist,
  checklistPercent,
} from "@/lib/db-types";
import {
  addChecklistItem,
  addOption,
  deleteChecklistItem,
  setCell,
  setChecklistItemText,
  toggleChecklistItem,
} from "@/lib/db-ops";
import SelectCell from "@/components/db/SelectCell";

type Update = (fn: (db: Database) => Database) => void;

function ProgressBar({ n }: { n: number }) {
  return (
    <div className="relative h-2 flex-1">
      <div className="absolute inset-0 rounded-full bg-slate-200 dark:bg-slate-700" />
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-[width]"
        style={{ width: `${n}%` }}
      />
    </div>
  );
}

function ChecklistEditor({
  field,
  rowId,
  value,
  update,
}: {
  field: Field;
  rowId: string;
  value: unknown;
  update: Update;
}) {
  const [text, setText] = useState("");
  const items = asChecklist(value);
  const pct = checklistPercent(value);
  const done = items.filter((i) => i.done).length;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <ProgressBar n={pct} />
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-slate-500">
          {done}/{items.length}
        </span>
      </div>
      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.id} className="group/ci flex items-center gap-2">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() =>
                update((d) => toggleChecklistItem(d, rowId, field.id, it.id))
              }
              className="h-4 w-4 accent-brand-500"
            />
            <input
              value={it.text}
              onChange={(e) =>
                update((d) =>
                  setChecklistItemText(d, rowId, field.id, it.id, e.target.value)
                )
              }
              className={`flex-1 bg-transparent text-sm outline-none ${
                it.done ? "text-slate-400 line-through" : ""
              }`}
            />
            <button
              onClick={() =>
                update((d) => deleteChecklistItem(d, rowId, field.id, it.id))
              }
              className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover/ci:opacity-100"
              aria-label="Hapus"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            update((d) => addChecklistItem(d, rowId, field.id, text.trim()));
            setText("");
          }
        }}
        placeholder="＋ Tambah sub-task…"
        className="mt-1.5 w-full bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

export default function CellEditor({
  field,
  rowId,
  value,
  update,
  variant = "cell",
}: {
  field: Field;
  rowId: string;
  value: unknown;
  update: Update;
  variant?: "cell" | "detail";
}) {
  switch (field.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) =>
            update((d) => setCell(d, rowId, field.id, e.target.checked))
          }
          className="h-4 w-4 accent-brand-500"
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) =>
            update((d) => setCell(d, rowId, field.id, e.target.value))
          }
          className="w-full bg-transparent text-sm outline-none"
        />
      );
    case "number":
      return (
        <input
          inputMode="decimal"
          value={(value as string) ?? ""}
          onChange={(e) =>
            update((d) => setCell(d, rowId, field.id, e.target.value))
          }
          className="w-full bg-transparent text-sm outline-none"
          placeholder="0"
        />
      );
    case "progress": {
      const n = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
      return (
        <div className="flex w-full items-center gap-2">
          <div className="relative h-2 flex-1">
            <div className="absolute inset-0 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-[width]"
              style={{ width: `${n}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={n}
              onChange={(e) =>
                update((d) => setCell(d, rowId, field.id, Number(e.target.value)))
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Progres"
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">
            {n}%
          </span>
        </div>
      );
    }
    case "checklist": {
      if (variant === "detail") {
        return (
          <ChecklistEditor
            field={field}
            rowId={rowId}
            value={value}
            update={update}
          />
        );
      }
      const items = asChecklist(value);
      const pct = checklistPercent(value);
      return (
        <div className="flex w-full items-center gap-2">
          <ProgressBar n={pct} />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
            {items.filter((i) => i.done).length}/{items.length}
          </span>
        </div>
      );
    }
    case "select":
      return (
        <SelectCell
          options={field.options ?? []}
          value={(value as string) ?? null}
          onSelect={(opt) => update((d) => setCell(d, rowId, field.id, opt))}
          onCreate={(nm) =>
            update((d) => {
              const { db: nd, option } = addOption(d, field.id, nm);
              return setCell(nd, rowId, field.id, option.id);
            })
          }
        />
      );
    default:
      return (
        <input
          value={(value as string) ?? ""}
          onChange={(e) =>
            update((d) => setCell(d, rowId, field.id, e.target.value))
          }
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Kosong"
        />
      );
  }
}
