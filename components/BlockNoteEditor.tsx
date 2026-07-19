"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/ariakit";
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
      onChange={() => onChange(editor.document)}
      className="min-h-[50vh]"
    />
  );
}
