import { describe, it, expect } from "vitest";
import { blocksToPlainText } from "@/lib/blocks-text";

describe("blocksToPlainText", () => {
  it("returns empty string for non-array / empty input", () => {
    expect(blocksToPlainText(null)).toBe("");
    expect(blocksToPlainText(undefined)).toBe("");
    expect(blocksToPlainText("nope")).toBe("");
    expect(blocksToPlainText([])).toBe("");
  });

  it("concatenates text from inline content across blocks", () => {
    const blocks = [
      { type: "heading", content: [{ type: "text", text: "Judul" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Halo" },
          { type: "text", text: "dunia" },
        ],
      },
    ];
    expect(blocksToPlainText(blocks)).toBe("Judul Halo dunia");
  });

  it("descends into nested children and link content", () => {
    const blocks = [
      {
        type: "bulletListItem",
        content: [
          { type: "text", text: "lihat" },
          { type: "link", content: [{ type: "text", text: "tautan" }] },
        ],
        children: [
          { type: "paragraph", content: [{ type: "text", text: "anak" }] },
        ],
      },
    ];
    expect(blocksToPlainText(blocks)).toBe("lihat tautan anak");
  });

  it("collapses whitespace and trims", () => {
    const blocks = [
      { type: "paragraph", content: [{ type: "text", text: "  a \n b  " }] },
    ];
    expect(blocksToPlainText(blocks)).toBe("a b");
  });

  it("ignores blocks without usable content", () => {
    const blocks = [
      { type: "image" },
      { type: "paragraph", content: [{ type: "text", text: "ok" }] },
    ];
    expect(blocksToPlainText(blocks)).toBe("ok");
  });
});
