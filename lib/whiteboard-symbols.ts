// MEP / electrical single-line-diagram (SLD) symbol set for the whiteboard.
//
// These are *pure* Excalidraw element skeletons (plain objects) so they can be
// unit-tested in Node without pulling in the browser-only Excalidraw runtime.
// The client helper in `lib/whiteboard-build.ts` converts them into real
// Excalidraw elements / library items.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Skeleton = Record<string, any>;

export type SymbolDef = {
  /** Stable key, also used to derive a deterministic library-item id. */
  key: string;
  /** Human label shown in the library panel. */
  name: string;
  /** Skeleton elements, authored around a (0,0) origin. */
  elements: Skeleton[];
};

const STROKE = "#1e1e1e";
const FONT = 4; // Excalidraw "Code" font — reads well for engineering symbols

function boxLabel(
  width: number,
  height: number,
  text: string,
  fontSize = 16
): Skeleton {
  return {
    type: "rectangle",
    x: 0,
    y: 0,
    width,
    height,
    strokeColor: STROKE,
    backgroundColor: "transparent",
    strokeWidth: 2,
    roughness: 0,
    label: { text, fontSize, fontFamily: FONT, strokeColor: STROKE },
  };
}

function circleLabel(size: number, text: string, fontSize = 16): Skeleton {
  return {
    type: "ellipse",
    x: 0,
    y: 0,
    width: size,
    height: size,
    strokeColor: STROKE,
    backgroundColor: "transparent",
    strokeWidth: 2,
    roughness: 0,
    label: { text, fontSize, fontFamily: FONT, strokeColor: STROKE },
  };
}

function line(points: [number, number][]): Skeleton {
  return {
    type: "line",
    x: points[0][0],
    y: points[0][1],
    points: points.map(([px, py]) => [px - points[0][0], py - points[0][1]]),
    strokeColor: STROKE,
    strokeWidth: 2,
    roughness: 0,
  };
}

/**
 * Every symbol authored around (0,0). Kept small (~40–90px) so several fit on a
 * canvas without rescaling.
 */
export function mepSymbols(): SymbolDef[] {
  return [
    {
      key: "panel",
      name: "Panel / DB",
      elements: [boxLabel(64, 84, "DB")],
    },
    {
      key: "mcb",
      name: "MCB (1P)",
      elements: [boxLabel(34, 56, "MCB", 12)],
    },
    {
      key: "mccb",
      name: "MCCB",
      elements: [boxLabel(48, 56, "MCCB", 11)],
    },
    {
      key: "ats",
      name: "ATS",
      elements: [boxLabel(64, 52, "ATS", 14)],
    },
    {
      key: "spd",
      name: "SPD / Arrester",
      elements: [boxLabel(34, 54, "SPD", 11)],
    },
    {
      key: "fuse",
      name: "Fuse",
      elements: [
        {
          type: "rectangle",
          x: 0,
          y: 0,
          width: 22,
          height: 52,
          strokeColor: STROKE,
          backgroundColor: "transparent",
          strokeWidth: 2,
          roughness: 0,
        },
        line([
          [11, 0],
          [11, 52],
        ]),
      ],
    },
    {
      key: "generator",
      name: "Generator (G)",
      elements: [circleLabel(48, "G")],
    },
    {
      key: "motor",
      name: "Motor (M)",
      elements: [circleLabel(48, "M")],
    },
    {
      key: "meter",
      name: "kWh Meter",
      elements: [circleLabel(50, "kWh", 12)],
    },
    {
      key: "transformer",
      name: "Transformer",
      elements: [
        {
          type: "ellipse",
          x: 0,
          y: 0,
          width: 40,
          height: 40,
          strokeColor: STROKE,
          backgroundColor: "transparent",
          strokeWidth: 2,
          roughness: 0,
        },
        {
          type: "ellipse",
          x: 0,
          y: 24,
          width: 40,
          height: 40,
          strokeColor: STROKE,
          backgroundColor: "transparent",
          strokeWidth: 2,
          roughness: 0,
        },
      ],
    },
    {
      key: "lamp",
      name: "Lamp / Light",
      elements: [
        {
          type: "ellipse",
          x: 0,
          y: 0,
          width: 40,
          height: 40,
          strokeColor: STROKE,
          backgroundColor: "transparent",
          strokeWidth: 2,
          roughness: 0,
        },
        line([
          [6, 6],
          [34, 34],
        ]),
        line([
          [34, 6],
          [6, 34],
        ]),
      ],
    },
    {
      key: "disconnector",
      name: "Switch / Isolator",
      elements: [
        line([
          [16, 0],
          [16, 14],
        ]),
        line([
          [16, 14],
          [34, 44],
        ]),
        line([
          [16, 46],
          [16, 60],
        ]),
        {
          type: "ellipse",
          x: 12,
          y: 42,
          width: 8,
          height: 8,
          strokeColor: STROKE,
          backgroundColor: STROKE,
          strokeWidth: 1,
          roughness: 0,
        },
      ],
    },
    {
      key: "ground",
      name: "Earth / Ground",
      elements: [
        line([
          [16, 0],
          [16, 20],
        ]),
        line([
          [2, 20],
          [30, 20],
        ]),
        line([
          [7, 27],
          [25, 27],
        ]),
        line([
          [12, 34],
          [20, 34],
        ]),
      ],
    },
    {
      key: "busbar",
      name: "Busbar",
      elements: [
        {
          type: "rectangle",
          x: 0,
          y: 0,
          width: 120,
          height: 6,
          strokeColor: STROKE,
          backgroundColor: STROKE,
          strokeWidth: 1,
          roughness: 0,
        },
      ],
    },
    {
      key: "cable",
      name: "Cable (3-core)",
      elements: [
        line([
          [0, 20],
          [80, 20],
        ]),
        line([
          [30, 10],
          [50, 30],
        ]),
        {
          type: "text",
          x: 34,
          y: 30,
          text: "3C",
          fontSize: 12,
          fontFamily: FONT,
          strokeColor: STROKE,
        },
      ],
    },
  ];
}
