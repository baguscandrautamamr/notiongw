"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SAMPLE = `flowchart TD
  A[Mulai] --> B{Sudah benar?}
  B -- Ya --> C[Selesai]
  B -- Tidak --> D[Perbaiki]
  D --> B`;

/**
 * Text-to-diagram modal. Parses mermaid syntax via
 * @excalidraw/mermaid-to-excalidraw (loaded lazily) and hands the resulting
 * element skeletons to the caller, which converts + inserts them.
 */
export default function MermaidModal({
  onInsert,
  onClose,
}: {
  onInsert: (skeletons: any[], files: any) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    areaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function insert() {
    setBusy(true);
    setError(null);
    try {
      const { parseMermaidToExcalidraw } = await import(
        "@excalidraw/mermaid-to-excalidraw"
      );
      const { elements, files } = await parseMermaidToExcalidraw(text.trim(), {
        themeVariables: { fontSize: "16px" },
      });
      if (!elements?.length) throw new Error("Diagram kosong.");
      onInsert(elements, files ?? {});
    } catch (e: any) {
      setError(e?.message || "Sintaks mermaid tidak valid.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            📊 Teks → Diagram (Mermaid)
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={9}
          className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-800 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {error && (
          <p className="text-xs text-rose-500">{error}</p>
        )}
        <div className="flex items-center justify-between">
          <a
            href="https://mermaid.js.org/syntax/flowchart.html"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            Panduan sintaks
          </a>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              onClick={insert}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {busy ? "Memproses…" : "Sisipkan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
