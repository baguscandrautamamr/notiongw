import { describe, it, expect } from "vitest";
import type { Database } from "@/lib/db-types";
import { cellToString, databaseToCsv } from "@/lib/csv";

function db(): Database {
  return {
    fields: [
      { id: "t", name: "Nama", type: "text" },
      {
        id: "s",
        name: "Status",
        type: "select",
        options: [
          { id: "o1", name: "Todo", color: "gray" },
          { id: "o2", name: "Done", color: "green" },
        ],
      },
      { id: "p", name: "Progres", type: "progress" },
      { id: "c", name: "Selesai", type: "checkbox" },
      { id: "cl", name: "Sub-task", type: "checklist" },
    ],
    rows: [
      {
        id: "r1",
        position: 0,
        cells: {
          t: "Beli, susu",
          s: "o2",
          p: 100,
          c: true,
          cl: [
            { id: "1", text: "a", done: true },
            { id: "2", text: "b", done: false },
          ],
        },
      },
      { id: "r2", position: 1, cells: { t: 'Kata "penting"', s: "o1" } },
    ],
    groupByFieldId: "s",
    view: { sortFieldId: null, sortDir: "asc", hideDone: false },
  };
}

describe("cellToString", () => {
  const d = db();
  const f = (id: string) => d.fields.find((x) => x.id === id)!;

  it("maps select ids to option names", () => {
    expect(cellToString(f("s"), "o2")).toBe("Done");
    expect(cellToString(f("s"), undefined)).toBe("");
  });
  it("formats checkbox as Ya/Tidak", () => {
    expect(cellToString(f("c"), true)).toBe("Ya");
    expect(cellToString(f("c"), false)).toBe("Tidak");
  });
  it("formats checklist as done/total", () => {
    expect(
      cellToString(f("cl"), [
        { id: "1", text: "a", done: true },
        { id: "2", text: "b", done: false },
      ])
    ).toBe("1/2");
    expect(cellToString(f("cl"), [])).toBe("");
  });
  it("formats progress numerically", () => {
    expect(cellToString(f("p"), 100)).toBe("100");
    expect(cellToString(f("p"), "")).toBe("");
  });
});

describe("databaseToCsv", () => {
  it("emits a header row from field names", () => {
    const csv = databaseToCsv(db());
    expect(csv.split("\r\n")[0]).toBe("Nama,Status,Progres,Selesai,Sub-task");
  });

  it("escapes commas and quotes per RFC 4180", () => {
    const lines = databaseToCsv(db()).split("\r\n");
    // row1: comma in text -> quoted; checklist 1/2
    expect(lines[1]).toBe('"Beli, susu",Done,100,Ya,1/2');
    // row2: embedded quotes doubled and wrapped
    expect(lines[2]).toBe('"Kata ""penting""",Todo,,Tidak,');
  });

  it("respects the view filter (hideDone)", () => {
    const d = db();
    d.view.hideDone = true;
    const lines = databaseToCsv(d).split("\r\n");
    expect(lines).toHaveLength(2); // header + only the not-done row
    expect(lines[1].startsWith('"Kata')).toBe(true);
  });
});
