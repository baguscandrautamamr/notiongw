// Export / clipboard helpers for an Excalidraw scene, shared by the full-page
// whiteboard and the inline whiteboard block.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  exportToBlob,
  exportToSvg,
  exportToClipboard,
} from "@excalidraw/excalidraw";

function fileName(name: string, ext: string) {
  const base = (name || "whiteboard").trim() || "whiteboard";
  return `${base}.${ext}`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function sceneOf(api: any) {
  return {
    elements: api.getSceneElements(),
    files: api.getFiles(),
    appState: { ...api.getAppState(), exportBackground: true },
  };
}

export async function exportPng(api: any, name: string) {
  if (!api) return;
  const blob = await exportToBlob({
    ...sceneOf(api),
    mimeType: "image/png",
    quality: 1,
  });
  downloadBlob(blob, fileName(name, "png"));
}

export async function exportSvg(api: any, name: string) {
  if (!api) return;
  const svg = await exportToSvg(sceneOf(api));
  const text = new XMLSerializer().serializeToString(svg);
  downloadBlob(new Blob([text], { type: "image/svg+xml" }), fileName(name, "svg"));
}

export async function copyToClipboard(api: any, type: "png" | "svg") {
  if (!api) return;
  await exportToClipboard({ ...sceneOf(api), type });
}
