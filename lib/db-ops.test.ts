import { describe, it, expect } from "vitest";
import type { Database, Row } from "@/lib/db-types";
import {
  isRowDone,
  setCell,
  addChecklistItem,
  toggleChecklistItem,
  visibleRows,
  addField,
  deleteField,
  addOption,
} from "@/lib/db-ops";

// A database with one of every relevant field, using stable ids so tests
// can address cells directly.
function makeDb(cells: Record<string, unknown> = {}): Database {
  const row: Row = { id: "r1", position: 0, cells };
  return {
    fields: [
      { id: "t", name: "Nama", type: "text" },
      {
        id: "s",
        name: "Status",
        type: "select",
        options: [
          { id: "opt-plan", name: "Planning", color: "purple" },
          { id: "opt-prog", name: "In progress", color: "blue" },
          { id: "opt-done", name: "Done", color: "green" },
        ],
      },
      { id: "p", name: "Progres", type: "progress" },
      { id: "c", name: "Selesai", type: "checkbox" },
      { id: "cl", name: "Sub-task", type: "checklist" },
    ],
    rows: [row],
    groupByFieldId: "s",
    view: { sortFieldId: null, sortDir: "asc", hideDone: false },
  };
}

const cells = (db: Database) => db.rows[0].cells;

describe("isRowDone", () => {
  it("is done when the checkbox is checked", () => {
    const db = makeDb({ c: true });
    expect(isRowDone(db, db.rows[0])).toBe(true);
  });

  it("is done when the status equals the Done option", () => {
    const db = makeDb({ s: "opt-done" });
    expect(isRowDone(db, db.rows[0])).toBe(true);
  });

  it("is not done otherwise", () => {
    const db = makeDb({ s: "opt-prog" });
    expect(isRowDone(db, db.rows[0])).toBe(false);
  });
});

describe("setCell completion automation", () => {
  it("checking the checkbox sets status=Done and progress=100", () => {
    const next = setCell(makeDb(), "r1", "c", true);
    expect(cells(next).c).toBe(true);
    expect(cells(next).s).toBe("opt-done");
    expect(cells(next).p).toBe(100);
  });

  it("setting progress to 100 marks the row complete everywhere", () => {
    const next = setCell(makeDb(), "r1", "p", 100);
    expect(cells(next).p).toBe(100);
    expect(cells(next).c).toBe(true);
    expect(cells(next).s).toBe("opt-done");
  });

  it("setting status to Done ticks the checkbox and fills progress", () => {
    const next = setCell(makeDb(), "r1", "s", "opt-done");
    expect(cells(next).c).toBe(true);
    expect(cells(next).p).toBe(100);
  });

  it("unchecking a done row reverts status and progress", () => {
    const done = setCell(makeDb(), "r1", "c", true);
    const next = setCell(done, "r1", "c", false);
    expect(cells(next).c).toBe(false);
    expect(cells(next).s).toBe("opt-prog"); // back to In progress
    expect(cells(next).p).toBe(0);
  });

  it("lowering progress below 100 unmarks a previously done row", () => {
    const done = setCell(makeDb(), "r1", "p", 100);
    const next = setCell(done, "r1", "p", 40);
    expect(cells(next).p).toBe(40);
    expect(cells(next).c).toBe(false);
    expect(cells(next).s).toBe("opt-prog");
  });
});

describe("checklist drives progress + completion", () => {
  it("toggling all items to done fills progress and marks complete", () => {
    let db = makeDb();
    db = addChecklistItem(db, "r1", "cl", "a");
    db = addChecklistItem(db, "r1", "cl", "b");
    expect(cells(db).p).toBe(0);

    const items = () => cells(db).cl as { id: string; done: boolean }[];
    db = toggleChecklistItem(db, "r1", "cl", items()[0].id);
    expect(cells(db).p).toBe(50);
    expect(cells(db).c).toBe(false);

    db = toggleChecklistItem(db, "r1", "cl", items()[1].id);
    expect(cells(db).p).toBe(100);
    expect(cells(db).c).toBe(true);
    expect(cells(db).s).toBe("opt-done");
  });
});

describe("visibleRows", () => {
  function multiRowDb(): Database {
    const db = makeDb();
    db.rows = [
      { id: "a", position: 2, cells: { t: "banana", p: 10 } },
      { id: "b", position: 0, cells: { t: "apple", p: 90, c: true } },
      { id: "c", position: 1, cells: { t: "cherry", p: 50 } },
    ];
    return db;
  }

  it("sorts by position by default", () => {
    expect(visibleRows(multiRowDb()).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("hides done rows when hideDone is set", () => {
    const db = multiRowDb();
    db.view.hideDone = true;
    expect(visibleRows(db).map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("sorts by a numeric/progress field ascending and descending", () => {
    const db = multiRowDb();
    db.view.sortFieldId = "p";
    expect(visibleRows(db).map((r) => r.id)).toEqual(["a", "c", "b"]);
    db.view.sortDir = "desc";
    expect(visibleRows(db).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts text fields alphabetically", () => {
    const db = multiRowDb();
    db.view.sortFieldId = "t";
    expect(visibleRows(db).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("field editing", () => {
  it("addField appends a field and auto-sets groupBy for the first select", () => {
    const base: Database = {
      fields: [{ id: "t", name: "Nama", type: "text" }],
      rows: [],
      groupByFieldId: null,
      view: { sortFieldId: null, sortDir: "asc", hideDone: false },
    };
    const next = addField(base, "select");
    expect(next.fields).toHaveLength(2);
    expect(next.fields[1].type).toBe("select");
    expect(next.groupByFieldId).toBe(next.fields[1].id);
  });

  it("deleteField drops the column from every row and repoints groupBy", () => {
    const next = deleteField(makeDb({ t: "x", s: "opt-done" }), "s");
    expect(next.fields.find((f) => f.id === "s")).toBeUndefined();
    expect("s" in next.rows[0].cells).toBe(false);
    expect(next.groupByFieldId).toBeNull(); // no other select field remains
  });

  it("addOption assigns distinct colors", () => {
    const r1 = addOption(makeDb(), "s", "Blocked");
    const field = r1.db.fields.find((f) => f.id === "s")!;
    const colors = field.options!.map((o) => o.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
