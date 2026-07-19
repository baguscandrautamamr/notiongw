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
import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";

export default function BlockNoteEditor({
  initialContent,
  onChange,
  theme,
}: {
  initialContent: PartialBlock[] | undefined;
  onChange: (blocks: Block[]) => void;
  theme: "light" | "dark";
}) {
  const editor = useCreateBlockNote({
    initialContent:
      initialContent && initialContent.length > 0 ? initialContent : undefined,
    uploadFile: async (file: File) => {
      const result = await uploadImage(file);
      return result.secure_url;
    },
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      slashMenu={false}
      onChange={() => onChange(editor.document)}
      className="min-h-[50vh]"
    >
      {/* Custom slash menu without the confusing inline "Table" block —
          use a Grid/Board database page instead. */}
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            getDefaultReactSlashMenuItems(editor).filter(
              (item) => !/table/i.test(item.title)
            ),
            query
          )
        }
      />
    </BlockNoteView>
  );
}
