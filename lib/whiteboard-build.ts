// Client-only helpers that turn pure skeletons into real Excalidraw elements.
// Imports the Excalidraw runtime, so this module must never be pulled into a
// Node/unit-test context (keep those on the pure `*-symbols` / `*-templates`).

/* eslint-disable @typescript-eslint/no-explicit-any */

import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { mepSymbols } from "@/lib/whiteboard-symbols";
import { templateSkeletons, type TemplateKind } from "@/lib/whiteboard-templates";

let gid = 0;
function nextGroup(prefix: string) {
  gid += 1;
  return `${prefix}-${Date.now().toString(36)}-${gid}`;
}

/** Build library items (one per symbol) for `excalidrawAPI.updateLibrary`. */
export function buildMepLibraryItems(): any[] {
  return mepSymbols().map((sym) => {
    const groupId = nextGroup(sym.key);
    const elements = convertToExcalidrawElements(sym.elements as any).map(
      (el: any) => ({ ...el, groupIds: [groupId] })
    );
    return {
      id: `bagusnote-mep-${sym.key}`,
      status: "unpublished" as const,
      created: Date.now(),
      name: sym.name,
      elements,
    };
  });
}

/** Build a template as ready-to-insert elements, shifted by (dx, dy). */
export function buildTemplateElements(
  kind: TemplateKind,
  dx = 0,
  dy = 0
): any[] {
  const els = convertToExcalidrawElements(templateSkeletons(kind) as any);
  return els.map((el: any) => ({ ...el, x: el.x + dx, y: el.y + dy }));
}
