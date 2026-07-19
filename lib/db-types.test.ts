import { describe, it, expect } from "vitest";
import {
  asChecklist,
  checklistPercent,
  coerceDatabase,
  defaultDatabase,
  firstTextFieldId,
  DEFAULT_VIEW,
  type Field,
} from "@/lib/db-types";

// defaultDatabase() mints random uids each call, so compare by shape
// (field names/types, empty rows, default view) rather than by object identity.
function expectDefaultShape(db: ReturnType<typeof coerceDatabase>) {
  const ref = defaultDatabase();
  expect(db.fields.map((f) => [f.name, f.type])).toEqual(
    ref.fields.map((f) => [f.name, f.type])
  );
  expect(db.rows).toEqual([]);
  expect(db.view).toEqual(DEFAULT_VIEW);
}

describe("coerceDatabase", () => {
  it("returns a fresh default database for null / non-object input", () => {
    expectDefaultShape(coerceDatabase(null));
    expectDefaultShape(coerceDatabase(undefined));
    expectDefaultShape(coerceDatabase("nonsense"));
  });

  it("returns a default database when fields is not an array", () => {
    expectDefaultShape(coerceDatabase({ fields: "oops" }));
  });

  it("keeps existing fields and fills missing rows/view", () => {
    const fields: Field[] = [{ id: "f1", name: "Nama", type: "text" }];
    const db = coerceDatabase({ fields });
    expect(db.fields).toBe(fields);
    expect(db.rows).toEqual([]);
    expect(db.view).toEqual(DEFAULT_VIEW);
  });

  it("infers groupByFieldId from the first select field when missing", () => {
    const fields: Field[] = [
      { id: "f1", name: "Nama", type: "text" },
      { id: "f2", name: "Status", type: "select", options: [] },
    ];
    expect(coerceDatabase({ fields }).groupByFieldId).toBe("f2");
  });

  it("merges partial view config over the defaults", () => {
    const db = coerceDatabase({
      fields: [{ id: "f1", name: "Nama", type: "text" }],
      view: { hideDone: true },
    });
    expect(db.view).toEqual({ ...DEFAULT_VIEW, hideDone: true });
  });
});

describe("firstTextFieldId", () => {
  it("prefers the first text field", () => {
    const fields: Field[] = [
      { id: "s", name: "Status", type: "select", options: [] },
      { id: "t", name: "Nama", type: "text" },
    ];
    expect(firstTextFieldId(fields)).toBe("t");
  });

  it("falls back to the first field when there is no text field", () => {
    const fields: Field[] = [{ id: "n", name: "Angka", type: "number" }];
    expect(firstTextFieldId(fields)).toBe("n");
  });

  it("returns null for an empty field list", () => {
    expect(firstTextFieldId([])).toBeNull();
  });
});

describe("checklist helpers", () => {
  it("asChecklist coerces non-arrays to an empty list", () => {
    expect(asChecklist(undefined)).toEqual([]);
    expect(asChecklist("x")).toEqual([]);
    const items = [{ id: "1", text: "a", done: false }];
    expect(asChecklist(items)).toBe(items);
  });

  it("checklistPercent rounds the ratio of done items", () => {
    expect(checklistPercent([])).toBe(0);
    expect(checklistPercent("garbage")).toBe(0);
    expect(
      checklistPercent([
        { id: "1", text: "a", done: true },
        { id: "2", text: "b", done: false },
      ])
    ).toBe(50);
    expect(
      checklistPercent([
        { id: "1", text: "a", done: true },
        { id: "2", text: "b", done: false },
        { id: "3", text: "c", done: false },
      ])
    ).toBe(33);
  });
});
