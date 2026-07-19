"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

function InlineWhiteboard({ block, editor }: { block: any; editor: any }) {
  const initial = useMemo(() => {
    try {
      return JSON.parse(block.props.scene || "{}");
    } catch {
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (elements: readonly any[], appState: any, files: any) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      editor.updateBlock(block, {
        props: {
          scene: JSON.stringify({
            elements,
            files,
            appState: { viewBackgroundColor: appState?.viewBackgroundColor },
          }),
        },
      });
    }, 900);
  };

  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  return (
    <div
      contentEditable={false}
      className="my-2 h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <Excalidraw
        theme={dark ? "dark" : "light"}
        initialData={{
          elements: initial.elements ?? [],
          files: initial.files ?? {},
          appState: {
            viewBackgroundColor:
              initial.appState?.viewBackgroundColor ??
              (dark ? "#0f172a" : "#ffffff"),
          },
        }}
        onChange={onChange}
      />
    </div>
  );
}

export const WhiteboardBlock = createReactBlockSpec(
  {
    type: "whiteboard",
    propSchema: { scene: { default: "" } },
    content: "none",
  },
  {
    render: (props) => (
      <InlineWhiteboard block={props.block} editor={props.editor} />
    ),
  }
);

export const schemaWithWhiteboard = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    whiteboard: WhiteboardBlock(),
  },
});
