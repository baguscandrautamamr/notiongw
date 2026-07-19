"use client";

import { useCallback, useState } from "react";
import {
  MainMenu,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import MermaidModal from "@/components/MermaidModal";
import { buildMepLibraryItems, buildTemplateElements } from "@/lib/whiteboard-build";
import { TEMPLATES, type TemplateKind } from "@/lib/whiteboard-templates";
import { exportPng, exportSvg, copyToClipboard } from "@/lib/whiteboard-export";

/* eslint-disable @typescript-eslint/no-explicit-any */

const emoji = (e: string) => (
  <span style={{ fontSize: 16, lineHeight: 1 }}>{e}</span>
);

/** Merge `elements` into the scene near the viewport center and select them. */
function insertElements(api: any, elements: any[]) {
  if (!api || elements.length === 0) return;
  const st = api.getAppState();
  const zoom = st.zoom?.value || 1;
  const xs = elements.map((e) => e.x);
  const ys = elements.map((e) => e.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const centerX = st.width / 2 / zoom - st.scrollX;
  const centerY = st.height / 2 / zoom - st.scrollY;
  const dx = centerX - minX - 120;
  const dy = centerY - minY - 120;
  const moved = elements.map((e) => ({ ...e, x: e.x + dx, y: e.y + dy }));
  const selectedElementIds: Record<string, true> = {};
  moved.forEach((e) => (selectedElementIds[e.id] = true));
  api.updateScene({
    elements: [...api.getSceneElements(), ...moved],
    appState: { selectedElementIds },
  });
  api.scrollToContent(moved, { fitToContent: true, animate: true });
}

/**
 * Shared whiteboard tooling: injects a custom Excalidraw main menu (MEP symbol
 * library, starter templates, text-to-diagram, SVG export, clipboard copy) and
 * the mermaid modal. Returns `menu` to render as an <Excalidraw> child and
 * `modal` to render alongside it.
 */
export function useWhiteboardTools(
  apiRef: { current: any },
  getName: () => string
) {
  const [mermaidOpen, setMermaidOpen] = useState(false);

  const loadMep = useCallback(() => {
    apiRef.current?.updateLibrary({
      libraryItems: buildMepLibraryItems(),
      merge: true,
      openLibraryMenu: true,
    });
  }, [apiRef]);

  const insertTemplate = useCallback(
    (kind: TemplateKind) => {
      insertElements(apiRef.current, buildTemplateElements(kind));
    },
    [apiRef]
  );

  const onMermaidInsert = useCallback(
    (skeletons: any[], files: any) => {
      const api = apiRef.current;
      if (api && files && Object.keys(files).length) {
        api.addFiles(Object.values(files));
      }
      insertElements(api, convertToExcalidrawElements(skeletons as any));
      setMermaidOpen(false);
    },
    [apiRef]
  );

  const menu = (
    <MainMenu>
      <MainMenu.Group title="BagusNote">
        <MainMenu.Item icon={emoji("📊")} onSelect={() => setMermaidOpen(true)}>
          Teks → Diagram
        </MainMenu.Item>
        <MainMenu.Item icon={emoji("⚡")} onSelect={loadMep}>
          Simbol MEP / Listrik
        </MainMenu.Item>
        {TEMPLATES.map((t) => (
          <MainMenu.Item
            key={t.kind}
            icon={emoji(t.icon)}
            onSelect={() => insertTemplate(t.kind)}
          >
            Template: {t.name}
          </MainMenu.Item>
        ))}
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.Group title="Ekspor">
        <MainMenu.Item
          icon={emoji("🖼️")}
          onSelect={() => exportPng(apiRef.current, getName())}
        >
          Export PNG
        </MainMenu.Item>
        <MainMenu.Item
          icon={emoji("🧩")}
          onSelect={() => exportSvg(apiRef.current, getName())}
        >
          Export SVG
        </MainMenu.Item>
        <MainMenu.Item
          icon={emoji("📋")}
          onSelect={() => copyToClipboard(apiRef.current, "png")}
        >
          Salin PNG ke clipboard
        </MainMenu.Item>
        <MainMenu.Item
          icon={emoji("📎")}
          onSelect={() => copyToClipboard(apiRef.current, "svg")}
        >
          Salin SVG ke clipboard
        </MainMenu.Item>
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.DefaultItems.Help />
    </MainMenu>
  );

  const modal = mermaidOpen ? (
    <MermaidModal
      onInsert={onMermaidInsert}
      onClose={() => setMermaidOpen(false)}
    />
  ) : null;

  return { menu, modal };
}
