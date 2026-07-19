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

  return (
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
  );
}
