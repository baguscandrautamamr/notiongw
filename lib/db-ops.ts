import {
  type Database,
  type Field,
  type FieldType,
  type Row,
  type SelectOption,
  OPTION_COLOR_KEYS,
  uid,
} from "@/lib/db-types";

export function addRow(db: Database, init?: Record<string, unknown>): Database {
  const position =
    db.rows.length > 0 ? Math.max(...db.rows.map((r) => r.position)) + 1 : 0;
  const row: Row = { id: uid(), position, cells: { ...(init ?? {}) } };
  return { ...db, rows: [...db.rows, row] };
}

export function deleteRow(db: Database, rowId: string): Database {
  return { ...db, rows: db.rows.filter((r) => r.id !== rowId) };
}

export function updateCell(
  db: Database,
  rowId: string,
  fieldId: string,
  value: unknown
): Database {
  return {
    ...db,
    rows: db.rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r
    ),
  };
}

const TYPE_DEFAULT_NAME: Record<FieldType, string> = {
  text: "Teks",
  number: "Angka",
  select: "Pilihan",
  checkbox: "Centang",
  date: "Tanggal",
};

export function addField(db: Database, type: FieldType): Database {
  const field: Field = {
    id: uid(),
    name: TYPE_DEFAULT_NAME[type],
    type,
    ...(type === "select" ? { options: [] } : {}),
  };
  const groupByFieldId =
    type === "select" && !db.groupByFieldId ? field.id : db.groupByFieldId;
  return { ...db, fields: [...db.fields, field], groupByFieldId };
}

export function updateField(
  db: Database,
  fieldId: string,
  patch: Partial<Field>
): Database {
  return {
    ...db,
    fields: db.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
  };
}

export function deleteField(db: Database, fieldId: string): Database {
  const rows = db.rows.map((r) => {
    const cells = { ...r.cells };
    delete cells[fieldId];
    return { ...r, cells };
  });
  const groupByFieldId =
    db.groupByFieldId === fieldId
      ? db.fields.find((f) => f.type === "select" && f.id !== fieldId)?.id ??
        null
      : db.groupByFieldId;
  return {
    ...db,
    fields: db.fields.filter((f) => f.id !== fieldId),
    rows,
    groupByFieldId,
  };
}

export function addOption(
  db: Database,
  fieldId: string,
  name: string
): { db: Database; option: SelectOption } {
  const field = db.fields.find((f) => f.id === fieldId);
  const usedColors = new Set((field?.options ?? []).map((o) => o.color));
  const color =
    OPTION_COLOR_KEYS.find((c) => !usedColors.has(c)) ??
    OPTION_COLOR_KEYS[(field?.options?.length ?? 0) % OPTION_COLOR_KEYS.length];
  const option: SelectOption = { id: uid(), name, color };
  const next = updateField(db, fieldId, {
    options: [...(field?.options ?? []), option],
  });
  return { db: next, option };
}

export function setGroupBy(db: Database, fieldId: string | null): Database {
  return { ...db, groupByFieldId: fieldId };
}
