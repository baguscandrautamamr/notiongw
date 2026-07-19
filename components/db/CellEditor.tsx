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
