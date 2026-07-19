// Extract plain text from a BlockNote document (array of blocks) so it can be
// stored in the `content` column and used as a lightweight full-text search
// index. Tolerant of unknown shapes — never throws.

type InlineLike = {
  text?: unknown;
  content?: unknown;
};

type BlockLike = {
  content?: unknown;
  children?: unknown;
};

function collectInline(content: unknown, out: string[]): void {
  if (!Array.isArray(content)) return;
  for (const item of content as InlineLike[]) {
    if (item && typeof item.text === "string") {
      out.push(item.text);
    } else if (item && Array.isArray(item.content)) {
      // e.g. link inline content wraps its own text nodes
      collectInline(item.content, out);
    }
  }
}

function collectBlocks(blocks: unknown, out: string[]): void {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks as BlockLike[]) {
    if (!block) continue;
    collectInline(block.content, out);
    if (Array.isArray(block.children)) collectBlocks(block.children, out);
  }
}

export function blocksToPlainText(blocks: unknown): string {
  const out: string[] = [];
  collectBlocks(blocks, out);
  return out
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20000); // cap so the search column stays reasonable
}
