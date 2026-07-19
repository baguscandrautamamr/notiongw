"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Block, PartialBlock } from "@blocknote/core";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteSummary } from "@/lib/types";
import EmojiPicker from "@/components/EmojiPicker";

const BlockNoteEditor = dynamic(() => import("@/components/BlockNoteEditor"), {
  ssr: false,
  loading: () => (
    <div className="mt-6 space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  ),
});

type SaveStatus = "idle" | "saving" | "saved";

export default function Editor({
  noteId,
  theme,
  onMetaChange,
}: {
  noteId: string;
  theme: "light" | "dark";
  onMetaChange: (meta: Pick<NoteSummary, "id" | "title" | "icon">) => void;
}) {
  const supabase = createClient();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);

  const docRef = useRef<Block[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the full note when the selected id changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    docRef.current = null;
    (async () => {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();
      if (cancelled) return;
      const n = data as Note | null;
      setNote(n);
      setTitle(n?.title ?? "");
      setIcon(n?.icon ?? "📄");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, supabase]);

  const persist = useCallback(async () => {
    setStatus("saving");
    const payload: Record<string, unknown> = {
      title: title.trim(),
      icon,
      updated_at: new Date().toISOString(),
    };
    if (docRef.current) payload.doc = docRef.current;

    const { error } = await supabase
      .from("notes")
      .update(payload)
      .eq("id", noteId);

    if (!error) {
      setStatus("saved");
      onMetaChange({ id: noteId, title: title.trim(), icon });
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("idle");
    }
  }, [title, icon, noteId, supabase, onMetaChange]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 700);
  }, [persist]);

  function handleDocChange(blocks: Block[]) {
    docRef.current = blocks;
    scheduleSave();
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    onMetaChange({ id: noteId, title: value, icon });
    scheduleSave();
  }

  function handleIconChange(value: string) {
    setIcon(value);
    setPickerOpen(false);
    onMetaChange({ id: noteId, title, icon: value });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 100);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16 md:px-10">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        Catatan tidak ditemukan.
      </div>
    );
  }

  const initialContent = (note.doc as PartialBlock[] | null) ?? undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10">
      {/* Status */}
      <div className="mb-2 h-4 text-xs text-slate-400">
        {status === "saving"
          ? "Menyimpan…"
          : status === "saved"
          ? "Tersimpan ✓"
          : ""}
      </div>

      {/* Icon */}
      <div className="relative inline-block">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="rounded-lg p-1 text-5xl leading-none transition hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Ganti ikon"
        >
          {icon}
        </button>
        {pickerOpen && (
          <EmojiPicker
            onPick={handleIconChange}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Title */}
      <textarea
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Tanpa judul"
        rows={1}
        className="mt-2 w-full resize-none border-none bg-transparent text-4xl font-bold leading-tight tracking-tight outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />

      {/* Block editor */}
      <div className="mt-3">
        <BlockNoteEditor
          key={note.id}
          initialContent={initialContent}
          onChange={handleDocChange}
          theme={theme}
        />
      </div>
    </div>
  );
}
