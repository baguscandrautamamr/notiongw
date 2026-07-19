import {
  type Database,
  type Field,
  type FieldType,
  type Row,
  type SelectOption,
  type ViewConfig,
  asChecklist,
  checklistPercent,
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

function getCell(db: Database, rowId: string, fieldId: string): unknown {
  return db.rows.find((r) => r.id === rowId)?.cells[fieldId];
}

// ---------- Completion automation ----------
// The "done" state keeps three things in sync: Status = Done option,
// all Progress fields = 100, and the Done checkbox = true.

function statusField(db: Database): Field | null {
  return (
    db.fields.find((f) => f.id === db.groupByFieldId && f.type === "select") ??
    db.fields.find((f) => f.type === "select") ??
    null
  );
}

function doneOptionId(field: Field | null): string | null {
  if (!field?.options?.length) return null;
  const byName = field.options.find((o) =>
    /done|selesai|complete|kelar|beres/i.test(o.name)
  );
  return (byName ?? field.options[field.options.length - 1]).id;
}

function inProgressOptionId(field: Field | null): string | null {
  return (
    field?.options?.find((o) => /progress|proses|jalan|kerja/i.test(o.name))
      ?.id ?? null
  );
}

function doneCheckboxField(db: Database): Field | null {
  return db.fields.find((f) => f.type === "checkbox") ?? null;
}

// Is a row considered "done"? (checkbox checked or status = Done option)
export function isRowDone(db: Database, row: Row): boolean {
  const cb = doneCheckboxField(db);
  if (cb && row.cells[cb.id] === true) return true;
  const sf = statusField(db);
  const doneOpt = doneOptionId(sf);
  return Boolean(sf && doneOpt && row.cells[sf.id] === doneOpt);
}

function setComplete(db: Database, rowId: string, complete: boolean): Database {
  let next = db;
  const sf = statusField(db);
  const doneOpt = doneOptionId(sf);
  const cb = doneCheckboxField(db);
  const progs = db.fields.filter((f) => f.type === "progress");

  if (complete) {
    if (sf && doneOpt) next = updateCell(next, rowId, sf.id, doneOpt);
    if (cb) next = updateCell(next, rowId, cb.id, true);
    progs.forEach((p) => (next = updateCell(next, rowId, p.id, 100)));
  } else {
    if (cb) next = updateCell(next, rowId, cb.id, false);
    if (sf && getCell(next, rowId, sf.id) === doneOpt) {
      next = updateCell(next, rowId, sf.id, inProgressOptionId(sf));
    }
    progs.forEach((p) => {
      if (Number(getCell(next, rowId, p.id)) >= 100) {
        next = updateCell(next, rowId, p.id, 0);
      }
    });
  }
  return next;
}

// Set a cell value AND apply completion automation for status/checkbox/progress.
export function setCell(
  db: Database,
  rowId: string,
  fieldId: string,
  value: unknown
): Database {
  let next = updateCell(db, rowId, fieldId, value);
  const field = db.fields.find((f) => f.id === fieldId);
  if (!field) return next;

  const sf = statusField(db);
  const doneOpt = doneOptionId(sf);
  const cb = doneCheckboxField(db);

  if (field.type === "checkbox" && cb && field.id === cb.id) {
    next = setComplete(next, rowId, value === true);
  } else if (field.type === "select" && sf && field.id === sf.id) {
    if (value === doneOpt) next = setComplete(next, rowId, true);
    else if (cb) next = updateCell(next, rowId, cb.id, false);
  } else if (field.type === "progress") {
    const n = Number(value) || 0;
    if (n >= 100) next = setComplete(next, rowId, true);
    else {
      if (cb) next = updateCell(next, rowId, cb.id, false);
      if (sf && getCell(next, rowId, sf.id) === doneOpt) {
        next = updateCell(next, rowId, sf.id, inProgressOptionId(sf));
      }
    }
  }
  return next;
}

// ---------- Checklist (sub-tasks) ----------
function syncFromChecklist(
  db: Database,
  rowId: string,
  fieldId: string
): Database {
  const items = asChecklist(getCell(db, rowId, fieldId));
  if (items.length === 0) return db;
  const pct = checklistPercent(items);
  let next = db;
  db.fields
    .filter((f) => f.type === "progress")
    .forEach((p) => (next = updateCell(next, rowId, p.id, pct)));
  return setComplete(next, rowId, pct >= 100);
}

export function addChecklistItem(
  db: Database,
  rowId: string,
  fieldId: string,
  text: string
): Database {
  const items = asChecklist(getCell(db, rowId, fieldId));
  const next = updateCell(db, rowId, fieldId, [
    ...items,
    { id: uid(), text, done: false },
  ]);
  return syncFromChecklist(next, rowId, fieldId);
}

export function toggleChecklistItem(
  db: Database,
  rowId: string,
  fieldId: string,
  itemId: string
): Database {
  const items = asChecklist(getCell(db, rowId, fieldId)).map((i) =>
    i.id === itemId ? { ...i, done: !i.done } : i
  );
  const next = updateCell(db, rowId, fieldId, items);
  return syncFromChecklist(next, rowId, fieldId);
}

export function setChecklistItemText(
  db: Database,
  rowId: string,
  fieldId: string,
  itemId: string,
  text: string
): Database {
  const items = asChecklist(getCell(db, rowId, fieldId)).map((i) =>
    i.id === itemId ? { ...i, text } : i
  );
  return updateCell(db, rowId, fieldId, items);
}

export function deleteChecklistItem(
  db: Database,
  rowId: string,
  fieldId: string,
  itemId: string
): Database {
  const items = asChecklist(getCell(db, rowId, fieldId)).filter(
    (i) => i.id !== itemId
  );
  const next = updateCell(db, rowId, fieldId, items);
  return syncFromChecklist(next, rowId, fieldId);
}

// ---------- Fields ----------
const TYPE_DEFAULT_NAME: Record<FieldType, string> = {
  text: "Teks",
  number: "Angka",
  select: "Pilihan",
  checkbox: "Centang",
  date: "Tanggal",
  progress: "Progres",
  checklist: "Sub-task",
  person: "Penanggung jawab",
};

export function addField(db: Database, type: FieldType): Database {
  const field: Field = {
    id: uid(),
    name: TYPE_DEFAULT_NAME[type],
    type,
    ...(type === "select" || type === "person" ? { options: [] } : {}),
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

export function setOptionPhoto(
  db: Database,
  fieldId: string,
  optionId: string,
  photo: string
): Database {
  const field = db.fields.find((f) => f.id === fieldId);
  if (!field?.options) return db;
  return updateField(db, fieldId, {
    options: field.options.map((o) =>
      o.id === optionId ? { ...o, photo } : o
    ),
  });
}

// ---------- View (filter/sort) ----------
export function setView(db: Database, patch: Partial<ViewConfig>): Database {
  return { ...db, view: { ...db.view, ...patch } };
}

// Returns rows filtered + sorted according to the view config.
export function visibleRows(db: Database): Row[] {
  const cb = doneCheckboxField(db);
  const sf = statusField(db);
  const doneOpt = doneOptionId(sf);

  let rows = [...db.rows];

  if (db.view.hideDone) {
    rows = rows.filter((r) => {
      const done =
        (cb && r.cells[cb.id] === true) ||
        (sf && doneOpt && r.cells[sf.id] === doneOpt);
      return !done;
    });
  }

  const sortId = db.view.sortFieldId;
  if (sortId) {
    const field = db.fields.find((f) => f.id === sortId);
    const dir = db.view.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = a.cells[sortId];
      const bv = b.cells[sortId];
      let cmp = 0;
      if (field?.type === "number" || field?.type === "progress") {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      } else if (field?.type === "checkbox") {
        cmp = (av ? 1 : 0) - (bv ? 1 : 0);
      } else if (field?.type === "select") {
        const idx = (v: unknown) =>
          field.options?.findIndex((o) => o.id === v) ?? -1;
        cmp = idx(av) - idx(bv);
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      }
      return cmp * dir;
    });
  } else {
    rows.sort((a, b) => a.position - b.position);
  }

  return rows;
}
