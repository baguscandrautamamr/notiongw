"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { createClient } from "@/lib/supabase/client";
import { updateNote } from "@/lib/offline-queue";
import type { Note, NoteSummary } from "@/lib/types";
import EmojiPicker from "@/components/EmojiPicker";
import Breadcrumb from "@/components/Breadcrumb";
import ShareButton from "@/components/ShareButton";
import { useWhiteboardTools } from "@/components/WhiteboardTools";
import { exportPng } from "@/lib/whiteboard-export";
import { offloadWhiteboardImages } from "@/lib/whiteboard-files";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Scene = {
  elements?: any[];
  files?: Record<string, any>;
  appState?: { viewBackgroundColor?: string };
};

export default function WhiteboardView({
  noteId,
  notes,
  theme,
  onSelect,
  onMetaChange,
}: {
  noteId: string;
  notes: NoteSummary[];
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onMetaChange: (meta: Pick<NoteSummary, "id" | "title" | "icon">) => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [scene, setScene] = useState<Scene | null>(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🎨");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);

  const titleRef = useRef("");
  const iconRef = useRef("🎨");
  const sceneRef = useRef<Scene>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiRef = useRef<any>(null);

  const { menu, modal } = useWhiteboardTools(apiRef, () => titleRef.current);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();
      if (cancelled) return;
      const n = data as Note | null;
      const doc = (n?.doc as Scene | null) ?? {};
      setScene(doc);
      sceneRef.current = doc;
      setTitle(n?.title ?? "");
      setIcon(n?.icon ?? "🎨");
      titleRef.current = n?.title ?? "";
      iconRef.current = n?.icon ?? "🎨";
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      if (offloadTimer.current) clearTimeout(offloadTimer.current);
    };
  }, [noteId, supabase]);

  const persist = useCallback(async () => {
    setStatus("saving");
    const { ok, queued } = await updateNote(supabase, noteId, {
      title: titleRef.current.trim(),
      icon: iconRef.current,
      doc: sceneRef.current,
      updated_at: new Date().toISOString(),
    });
    if (ok || queued) {
      setStatus("saved");
      onMetaChange({
        id: noteId,
        title: titleRef.current.trim(),
        icon: iconRef.current,
      });
      setTimeout(() => setStatus("idle"), 1200);
    } else {
      setStatus("idle");
    }
  }, [noteId, supabase, onMetaChange]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 900);
  }, [persist]);

  // Debounced: push oversized inline (base64) images to Cloudinary so the
  // saved scene stays light. On success it swaps the file in place, which
  // fires onChange again and persists the URL version.
  const scheduleOffload = useCallback(() => {
    if (offloadTimer.current) clearTimeout(offloadTimer.current);
    offloadTimer.current = setTimeout(() => {
      offloadWhiteboardImages(apiRef.current).catch(() => {});
    }, 1600);
  }, []);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      sceneRef.current = {
        elements: elements as any[],
        files,
        appState: { viewBackgroundColor: appState?.viewBackgroundColor },
      };
      scheduleSave();
      scheduleOffload();
    },
    [scheduleSave, scheduleOffload]
  );

  function handleTitle(v: string) {
    setTitle(v);
    titleRef.current = v;
    onMetaChange({ id: noteId, title: v, icon });
    scheduleSave();
  }
  function handleIcon(v: string) {
    setIcon(v);
    iconRef.current = v;
    setPickerOpen(false);
    onMetaChange({ id: noteId, title, icon: v });
    scheduleSave();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="loadbar-track h-1.5 w-28 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="loadbar-fill" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Breadcrumb notes={notes} activeId={noteId} onSelect={onSelect} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {status === "saving"
                ? "Menyimpan…"
                : status === "saved"
                ? "Tersimpan ✓"
                : ""}
            </span>
            <button
              onClick={() => exportPng(apiRef.current, titleRef.current)}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              ⬇ Export PNG
            </button>
            <ShareButton noteId={noteId} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="rounded-lg p-1 text-2xl leading-none transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Ganti ikon"
            >
              {icon}
            </button>
            {pickerOpen && (
              <EmojiPicker
                onPick={handleIcon}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
          <input
            value={title}
            onChange={(e) => handleTitle(e.target.value)}
            placeholder="Tanpa judul"
            className="w-full border-none bg-transparent text-xl font-bold outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1">
        <Excalidraw
          theme={theme}
          excalidrawAPI={(api) => (apiRef.current = api)}
          initialData={{
            elements: scene?.elements ?? [],
            files: scene?.files ?? {},
            appState: {
              viewBackgroundColor:
                scene?.appState?.viewBackgroundColor ??
                (theme === "dark" ? "#0f172a" : "#ffffff"),
            },
            scrollToContent: true,
          }}
          onChange={handleChange}
        >
          {menu}
        </Excalidraw>
        {modal}
      </div>
    </div>
  );
}
