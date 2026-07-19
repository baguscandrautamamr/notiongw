// Data model for Grid/Board database pages (AppFlowy/Notion style).

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "progress"
  | "checklist"
  | "person";

export type SelectOption = {
  id: string;
  name: string;
  color: string; // tailwind-ish token key, see OPTION_COLORS
  photo?: string; // avatar URL (for "person" fields)
};

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Field = {
  id: string;
  name: string;
  type: FieldType;
  options?: SelectOption[]; // for "select"
  width?: number;
};

export type Row = {
  id: string;
  position: number;
  cells: Record<string, unknown>; // fieldId -> value
};

// Per-database view settings (filter/sort), persisted with the db.
export type ViewConfig = {
  sortFieldId: string | null;
  sortDir: "asc" | "desc";
  hideDone: boolean;
};

export type Database = {
  fields: Field[];
  rows: Row[];
  groupByFieldId: string | null; // which select field the Board groups by
  view: ViewConfig;
};

export const OPTION_COLORS: Record<string, { bg: string; text: string }> = {
  gray: { bg: "#e2e8f0", text: "#334155" },
  red: { bg: "#fecaca", text: "#991b1b" },
  orange: { bg: "#fed7aa", text: "#9a3412" },
  yellow: { bg: "#fef08a", text: "#854d0e" },
  green: { bg: "#bbf7d0", text: "#166534" },
  blue: { bg: "#bfdbfe", text: "#1e40af" },
  purple: { bg: "#e9d5ff", text: "#6b21a8" },
  pink: { bg: "#fbcfe8", text: "#9d174b" },
};

export const OPTION_COLOR_KEYS = Object.keys(OPTION_COLORS);

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (very unlikely to be needed in modern browsers)
  return "id-" + Date.now().toString(36) + "-" + performance.now().toString(36);
}

export const DEFAULT_VIEW: ViewConfig = {
  sortFieldId: null,
  sortDir: "asc",
  hideDone: false,
};

// A fresh database with common task-tracker columns.
export function defaultDatabase(): Database {
  const statusId = uid();
  return {
    fields: [
      { id: uid(), name: "Nama", type: "text" },
      {
        id: statusId,
        name: "Status",
        type: "select",
        options: [
          { id: uid(), name: "Planning", color: "purple" },
          { id: uid(), name: "In progress", color: "blue" },
          { id: uid(), name: "Done", color: "green" },
        ],
      },
      { id: uid(), name: "Progres", type: "progress" },
      { id: uid(), name: "Tanggal", type: "date" },
      { id: uid(), name: "Selesai", type: "checkbox" },
    ],
    rows: [],
    groupByFieldId: statusId,
    view: { ...DEFAULT_VIEW },
  };
}

export function coerceDatabase(value: unknown): Database {
  const db = value as Partial<Database> | null;
  if (!db || !Array.isArray(db.fields)) return defaultDatabase();
  return {
    fields: db.fields,
    rows: Array.isArray(db.rows) ? db.rows : [],
    groupByFieldId:
      db.groupByFieldId ??
      db.fields.find((f) => f.type === "select")?.id ??
      null,
    view: { ...DEFAULT_VIEW, ...(db.view ?? {}) },
  };
}

export function firstTextFieldId(fields: Field[]): string | null {
  return fields.find((f) => f.type === "text")?.id ?? fields[0]?.id ?? null;
}

// ----- Checklist helpers -----
export function asChecklist(value: unknown): ChecklistItem[] {
  return Array.isArray(value) ? (value as ChecklistItem[]) : [];
}

export function checklistPercent(value: unknown): number {
  const items = asChecklist(value);
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}
