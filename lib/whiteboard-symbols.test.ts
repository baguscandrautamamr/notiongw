import { describe, it, expect } from "vitest";
import { mepSymbols } from "@/lib/whiteboard-symbols";

describe("mepSymbols", () => {
  const symbols = mepSymbols();

  it("returns a non-empty set with unique keys", () => {
    expect(symbols.length).toBeGreaterThan(10);
    const keys = symbols.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every symbol has a name and at least one element", () => {
    for (const s of symbols) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.elements.length).toBeGreaterThan(0);
    }
  });

  it("every element declares a known primitive type", () => {
    const allowed = new Set([
      "rectangle",
      "ellipse",
      "diamond",
      "line",
      "arrow",
      "text",
    ]);
    for (const s of symbols) {
      for (const el of s.elements) {
        expect(allowed.has(el.type)).toBe(true);
      }
    }
  });

  it("line elements carry a points array anchored at origin", () => {
    for (const s of symbols) {
      for (const el of s.elements) {
        if (el.type === "line") {
          expect(Array.isArray(el.points)).toBe(true);
          expect(el.points[0]).toEqual([0, 0]);
        }
      }
    }
  });
});
