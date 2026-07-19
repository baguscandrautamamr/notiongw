// Convert a database (grid/board) to CSV text. Respects the current view's
// filter/sort via visibleRows so the export matches what the user sees.

import type { Database, Field } from "@/lib/db-types";
import { asChecklist } from "@/lib/db-types";
import { visibleRows } from "@/lib/db-ops";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function cellToString(field: Field, value: unknown): string {
  switch (field.type) {
    case "checkbox":
      return value === true ? "Ya" : "Tidak";
    case "select":
    case "person": {
      const opt = field.options?.find((o) => o.id === value);
      return opt?.name ?? "";
    }
    case "progress":
      return value == null || value === "" ? "" : String(Number(value) || 0);
    case "checklist": {
      const items = asChecklist(value);
      if (items.length === 0) return "";
      return `${items.filter((i) => i.done).length}/${items.length}`;
    }
    default:
      return value == null ? "" : String(value);
  }
}

export function databaseToCsv(db: Database): string {
  const fields = db.fields;
  const header = fields.map((f) => escapeCsv(f.name)).join(",");
  const lines = visibleRows(db).map((row) =>
    fields.map((f) => escapeCsv(cellToString(f, row.cells[f.id]))).join(",")
  );
  return [header, ...lines].join("\r\n");
}
