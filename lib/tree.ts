import type { NoteSummary, TreeNode } from "@/lib/types";

// Build a nested tree from a flat list, sorted by `position` at every level.
export function buildTree(notes: NoteSummary[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  notes.forEach((n) => byId.set(n.id, { ...n, children: [] }));

  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.position - b.position);
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

// All descendant ids of a node (used to prevent dropping a page into itself).
export function descendantIds(
  notes: NoteSummary[],
  rootId: string
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  notes.forEach((n) => {
    if (n.parent_id) {
      const arr = childrenOf.get(n.parent_id) ?? [];
      arr.push(n.id);
      childrenOf.set(n.parent_id, arr);
    }
  });
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}

// Compute a new fractional `position` for placing an item among `siblings`
// (already ordered) at `index`. Siblings should NOT include the moved item.
export function positionForIndex(
  siblings: { position: number }[],
  index: number
): number {
  if (siblings.length === 0) return 0;
  if (index <= 0) return siblings[0].position - 1;
  if (index >= siblings.length)
    return siblings[siblings.length - 1].position + 1;
  return (siblings[index - 1].position + siblings[index].position) / 2;
}
