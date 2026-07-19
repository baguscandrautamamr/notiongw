// Convert plain text extracted from a PDF into BlockNote paragraph blocks.
// Kept pure (no pdf.js import) so it is easy to unit-test.

import type { PartialBlock } from "@blocknote/core";

export function textToBlocks(text: string): PartialBlock[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/) // blank-line separated paragraphs
    .map((p) => p.replace(/[ \t]*\n[ \t]*/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return [{ type: "paragraph" }] as PartialBlock[];
  }

  return paragraphs.map(
    (p) =>
      ({
        type: "paragraph",
        content: [{ type: "text", text: p, styles: {} }],
      }) as PartialBlock
  );
}
