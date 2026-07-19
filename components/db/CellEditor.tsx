"use client";

import { type Database, type Field } from "@/lib/db-types";
import { addOption, updateCell } from "@/lib/db-ops";
import SelectCell from "@/components/db/SelectCell";

type Update = (fn: (db: Database) => Database) => void;

export default function CellEditor({
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
  switch (field.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) =>
            update((d) => updateCell(d, rowId, field.id, e.target.checked))
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
            update((d) => updateCell(d, rowId, field.id, e.target.value))
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
            update((d) => updateCell(d, rowId, field.id, e.target.value))
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
                update((d) =>
                  updateCell(d, rowId, field.id, Number(e.target.value))
                )
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
    case "select":
      return (
        <SelectCell
          options={field.options ?? []}
          value={(value as string) ?? null}
          onSelect={(opt) => update((d) => updateCell(d, rowId, field.id, opt))}
          onCreate={(nm) =>
            update((d) => {
              const { db: nd, option } = addOption(d, field.id, nm);
              return updateCell(nd, rowId, field.id, option.id);
            })
          }
        />
      );
    default:
      return (
        <input
          value={(value as string) ?? ""}
          onChange={(e) =>
            update((d) => updateCell(d, rowId, field.id, e.target.value))
          }
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Kosong"
        />
      );
  }
}
