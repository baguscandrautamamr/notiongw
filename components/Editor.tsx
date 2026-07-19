"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Block, PartialBlock } from "@blocknote/core";
import { createClient } from "@/lib/supabase/client";
import { updateNote } from "@/lib/offline-queue";
import { blocksToPlainText } from "@/lib/blocks-text";
import { uploadImage } from "@/lib/cloudinary";
import type { Note, NoteSummary } from "@/lib/types";
import EmojiPicker from "@/components/EmojiPicker";
import Breadcrumb from "@/components/Breadcrumb";
import ShareButton from "@/components/ShareButton";

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
  notes,
  theme,
  onSelect,
  onMetaChange,
  onCreateSubpage,
}: {
  noteId: string;
  notes: NoteSummary[];
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onMetaChange: (meta: Pick<NoteSummary, "id" | "title" | "icon">) => void;
  onCreateSubpage: (parentId: string) => void;
}) {
  const supabase = createClient();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");
  const [cover, setCover] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);

  const docRef = useRef<Block[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

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
      setCover(n?.cover_url ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, supabase]);

  const persist = useCallback(
    async (overrides?: Record<string, unknown>) => {
      setStatus("saving");
      const payload: Record<string, unknown> = {
        title: title.trim(),
        icon,
        cover_url: cover,
        updated_at: new Date().toISOString(),
        ...overrides,
      };
      if (docRef.current) {
        payload.doc = docRef.current;
        // Mirror the document text into `content` as a search index.
        payload.content = blocksToPlainText(docRef.current);
      }

      const { ok, queued } = await updateNote(supabase, noteId, payload);

      if (ok || queued) {
        setStatus("saved");
        onMetaChange({ id: noteId, title: title.trim(), icon });
        setTimeout(() => setStatus("idle"), 1500);
      } else {
        setStatus("idle");
      }
    },
    [title, icon, cover, noteId, supabase, onMetaChange]
  );

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(), 700);
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
    timer.current = setTimeout(() => persist({ icon: value }), 100);
  }

  async function handleCoverFile(file: File) {
    setCoverBusy(true);
    try {
      const result = await uploadImage(file);
      setCover(result.secure_url);
      await persist({ cover_url: result.secure_url });
    } catch {
      /* ignore */
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCover(null);
    await persist({ cover_url: null });
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
    <div className="group/page fade-in">
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleCoverFile(f);
          e.target.value = "";
        }}
      />

      {/* Cover */}
      {cover && (
        <div className="group/cover relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="Cover" className="h-full w-full object-cover" />
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition group-hover/cover:opacity-100">
            <button
              onClick={() => coverInput.current?.click()}
              className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
            >
              {coverBusy ? "Mengunggah…" : "Ganti cover"}
            </button>
            <button
              onClick={removeCover}
              className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
            >
              Hapus
            </button>
          </div>
        </div>
      )}

      <div
        className={`mx-auto w-full max-w-3xl px-6 md:px-10 ${
          cover ? "pt-4" : "pt-10"
        } pb-16`}
      >
        {/* Breadcrumb */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <Breadcrumb notes={notes} activeId={noteId} onSelect={onSelect} />
          <ShareButton noteId={noteId} />
        </div>

        {/* Hover toolbar */}
        <div className="mb-1 flex h-7 items-center gap-1 text-xs text-slate-500">
          <span className="mr-auto text-slate-400">
            {status === "saving"
              ? "Menyimpan…"
              : status === "saved"
              ? "Tersimpan ✓"
              : ""}
          </span>
          <div className="flex gap-1 opacity-0 transition group-hover/page:opacity-100">
            {!cover && (
              <button
                onClick={() => coverInput.current?.click()}
                className="rounded-md px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {coverBusy ? "Mengunggah…" : "🖼️ Tambah cover"}
              </button>
            )}
            <button
              onClick={() => onCreateSubpage(note.id)}
              className="rounded-md px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ＋ Sub-halaman
            </button>
          </div>
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
    </div>
  );
}
