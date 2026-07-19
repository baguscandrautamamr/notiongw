import { describe, it, expect } from "vitest";
import { textToBlocks } from "@/lib/pdf-blocks";

type P = { type: string; content?: { text: string }[] };

describe("textToBlocks", () => {
  it("returns a single empty paragraph for blank input", () => {
    const blocks = textToBlocks("   \n\n  ") as P[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toBeUndefined();
  });

  it("splits on blank lines into separate paragraphs", () => {
    const blocks = textToBlocks("Baris satu.\n\nBaris dua.") as P[];
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content?.[0].text).toBe("Baris satu.");
    expect(blocks[1].content?.[0].text).toBe("Baris dua.");
  });

  it("joins single line breaks within a paragraph and collapses whitespace", () => {
    const blocks = textToBlocks("kalimat yang\nterpotong   di   sini") as P[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content?.[0].text).toBe("kalimat yang terpotong di sini");
  });

  it("drops empty paragraphs between content", () => {
    const blocks = textToBlocks("A\n\n\n\nB\n\n   \n\nC") as P[];
    expect(blocks.map((b) => b.content?.[0].text)).toEqual(["A", "B", "C"]);
  });
});
