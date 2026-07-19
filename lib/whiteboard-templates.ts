// Starter templates for the whiteboard.
//
// Pure Excalidraw element skeletons (plain objects) so they stay unit-testable
// in Node. `lib/whiteboard-build.ts` converts them into real elements before
// they are added to a scene.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Skeleton } from "@/lib/whiteboard-symbols";

export type TemplateKind = "flowchart" | "mindmap" | "kanban";

export const TEMPLATES: { kind: TemplateKind; name: string; icon: string }[] = [
  { kind: "flowchart", name: "Flowchart", icon: "🔀" },
  { kind: "mindmap", name: "Mind map", icon: "🧠" },
  { kind: "kanban", name: "Checklist board", icon: "🗂️" },
];

const STROKE = "#1e1e1e";
const FONT = 1; // "Normal" font

function box(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  extra: Record<string, any> = {}
): Skeleton {
  return {
    type: "rectangle",
    id,
    x,
    y,
    width,
    height,
    strokeColor: STROKE,
    backgroundColor: "transparent",
    strokeWidth: 2,
    roughness: 1,
    label: { text, fontSize: 16, fontFamily: FONT, strokeColor: STROKE },
    ...extra,
  };
}

function arrow(startId: string, endId: string): Skeleton {
  return {
    type: "arrow",
    x: 0,
    y: 0,
    strokeColor: STROKE,
    strokeWidth: 2,
    roughness: 1,
    start: { id: startId },
    end: { id: endId },
  };
}

function flowchart(): Skeleton[] {
  return [
    {
      type: "ellipse",
      id: "fc-start",
      x: 80,
      y: 0,
      width: 140,
      height: 60,
      strokeColor: STROKE,
      backgroundColor: "#e7f5ff",
      roughness: 1,
      label: { text: "Mulai", fontSize: 16, fontFamily: FONT },
    },
    box("fc-proc", 80, 120, 140, 60, "Proses"),
    {
      type: "diamond",
      id: "fc-dec",
      x: 70,
      y: 240,
      width: 160,
      height: 90,
      strokeColor: STROKE,
      backgroundColor: "#fff9db",
      roughness: 1,
      label: { text: "Keputusan?", fontSize: 15, fontFamily: FONT },
    },
    box("fc-yes", 80, 390, 140, 60, "Selesai", {
      backgroundColor: "#ebfbee",
    }),
    box("fc-no", 300, 255, 130, 60, "Ulangi"),
    arrow("fc-start", "fc-proc"),
    arrow("fc-proc", "fc-dec"),
    arrow("fc-dec", "fc-yes"),
    arrow("fc-dec", "fc-no"),
  ];
}

function mindmap(): Skeleton[] {
  const branches = [
    { id: "mm-a", x: 340, y: 20, text: "Cabang 1" },
    { id: "mm-b", x: 340, y: 200, text: "Cabang 2" },
    { id: "mm-c", x: -60, y: 20, text: "Cabang 3" },
    { id: "mm-d", x: -60, y: 200, text: "Cabang 4" },
  ];
  return [
    {
      type: "rectangle",
      id: "mm-core",
      x: 120,
      y: 110,
      width: 160,
      height: 70,
      strokeColor: STROKE,
      backgroundColor: "#d0bfff",
      roughness: 1,
      roundness: { type: 3 },
      label: { text: "Ide utama", fontSize: 18, fontFamily: FONT },
    },
    ...branches.map((b) =>
      box(b.id, b.x, b.y, 130, 56, b.text, { roundness: { type: 3 } })
    ),
    ...branches.map((b) => arrow("mm-core", b.id)),
  ];
}

function kanban(): Skeleton[] {
  const cols = [
    { x: 0, title: "To Do", tint: "#fff5f5" },
    { x: 240, title: "In Progress", tint: "#fff9db" },
    { x: 480, title: "Done", tint: "#ebfbee" },
  ];
  const els: Skeleton[] = [];
  cols.forEach((c, ci) => {
    els.push({
      type: "rectangle",
      x: c.x,
      y: 0,
      width: 210,
      height: 320,
      strokeColor: STROKE,
      backgroundColor: c.tint,
      roughness: 1,
      roundness: { type: 3 },
      label: {
        text: c.title,
        fontSize: 16,
        fontFamily: FONT,
        verticalAlign: "top",
      },
    });
    // two placeholder cards per column
    for (let k = 0; k < 2; k++) {
      els.push({
        type: "rectangle",
        x: c.x + 20,
        y: 60 + k * 90,
        width: 170,
        height: 70,
        strokeColor: STROKE,
        backgroundColor: "#ffffff",
        roughness: 1,
        roundness: { type: 3 },
        label: {
          text: ci === 0 ? "Tugas baru" : "…",
          fontSize: 13,
          fontFamily: FONT,
        },
      });
    }
  });
  return els;
}

export function templateSkeletons(kind: TemplateKind): Skeleton[] {
  switch (kind) {
    case "flowchart":
      return flowchart();
    case "mindmap":
      return mindmap();
    case "kanban":
      return kanban();
    default:
      return [];
  }
}
