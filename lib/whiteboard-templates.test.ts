import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  templateSkeletons,
  type TemplateKind,
} from "@/lib/whiteboard-templates";

describe("templateSkeletons", () => {
  it("exposes the three advertised templates", () => {
    expect(TEMPLATES.map((t) => t.kind)).toEqual([
      "flowchart",
      "mindmap",
      "kanban",
    ]);
  });

  it("produces elements for every template kind", () => {
    for (const t of TEMPLATES) {
      expect(templateSkeletons(t.kind).length).toBeGreaterThan(0);
    }
  });

  it("returns [] for an unknown kind", () => {
    expect(templateSkeletons("nope" as TemplateKind)).toEqual([]);
  });

  it("flowchart arrows reference ids that exist in the scene", () => {
    const els = templateSkeletons("flowchart");
    const ids = new Set(els.filter((e) => e.id).map((e) => e.id));
    const arrows = els.filter((e) => e.type === "arrow");
    expect(arrows.length).toBeGreaterThan(0);
    for (const a of arrows) {
      expect(ids.has(a.start.id)).toBe(true);
      expect(ids.has(a.end.id)).toBe(true);
    }
  });
});
