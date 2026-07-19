"use client";

import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
import { filterSuggestionItems } from "@blocknote/core";
import type { Block, PartialBlock } from "@blocknote/core";
import { uploadImage } from "@/lib/cloudinary";
import { schemaWithWhiteboard } from "@/components/blocks/WhiteboardBlock";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import "@excalidraw/excalidraw/index.css";

export default function BlockNoteEditor({
  initialContent,
  onChange,
  theme,
  editable = true,
}: {
  initialContent: PartialBlock[] | undefined;
  onChange: (blocks: Block[]) => void;
  theme: "light" | "dark";
  editable?: boolean;
}) {
  const editor = useCreateBlockNote({
    schema: schemaWithWhiteboard,
    initialContent:
      initialContent && initialContent.length > 0
        ? (initialContent as never)
        : undefined,
    uploadFile: async (file: File) => {
      const result = await uploadImage(file);
      return result.secure_url;
    },
  });

  // Touch devices have no hover, so BlockNote's side-menu "+" button (and drag
  // handle) never appear. This replicates the built-in add-block button: insert
  // an empty paragraph after the cursor (or reuse the current empty block) and
  // open the slash "/" menu so a block type can be picked — same as on the web.
  function addBlock() {
    try {
      const doc = editor.document as Block[];
      let ref: Block | undefined;
      try {
        ref = editor.getTextCursorPosition().block as Block;
      } catch {
        ref = doc[doc.length - 1];
      }
      if (!ref) return;
      const content = (ref as { content?: unknown }).content;
      const isEmpty = Array.isArray(content) && content.length === 0;
      const target = isEmpty
        ? ref
        : (editor.insertBlocks(
            [{ type: "paragraph" } as never],
            ref,
            "after"
          )[0] as Block);
      editor.setTextCursorPosition(target, "end");
      editor.focus();
      // Best-effort: open the slash menu via the suggestion-menu extension.
      const ext = editor.extensions?.get?.("suggestionMenu") as
        | { openSuggestionMenu?: (t: string) => void }
        | undefined;
      ext?.openSuggestionMenu?.("/");
    } catch {
      /* no-op */
    }
  }

  return (
    <>
      <BlockNoteView
        editor={editor}
        theme={theme}
        editable={editable}
        slashMenu={false}
        onChange={() => onChange(editor.document as Block[])}
        className="min-h-[50vh]"
      >
      {/* Custom slash menu: drop the confusing inline "Table" block, add an
          embeddable Whiteboard block. */}
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor).filter(
                (item) => !/table/i.test(item.title)
              ),
              {
                title: "Papan (Whiteboard)",
                subtext: "Sisipkan kanvas gambar Excalidraw",
                aliases: ["whiteboard", "papan", "gambar", "excalidraw", "canvas"],
                group: "Media",
                icon: <span>🎨</span>,
                onItemClick: () => {
                  editor.insertBlocks(
                    [{ type: "whiteboard" } as never],
                    editor.getTextCursorPosition().block,
                    "after"
                  );
                },
              },
            ],
            query
          )
        }
        />
      </BlockNoteView>

      {/* Touch-only add-block button (desktop uses BlockNote's hover "+"). */}
      {editable && (
        <button
          type="button"
          onClick={addBlock}
          className="mt-1 hidden w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 [@media(hover:none)]:flex dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <span className="grid h-5 w-5 place-items-center rounded border border-slate-300 text-base leading-none dark:border-slate-600">
            ＋
          </span>
          Tambah blok
        </button>
      )}
    </>
  );
}
