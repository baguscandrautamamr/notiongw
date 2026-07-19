"use client";

import { useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { textToBlocks } from "@/lib/pdf-blocks";

// Extract text from a PDF entirely in the browser using pdf.js. No server or
// Java needed, so it works on Vercel.
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker (emitted as a static asset by the bundler).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  await doc.destroy();
  return pages.join("\n\n");
}

export default function ImportPdfButton({
  onImport,
}: {
  onImport: (title: string, blocks: PartialBlock[]) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const text = await extractPdfText(file);
      const blocks = textToBlocks(text);
      const title = file.name.replace(/\.pdf$/i, "");
      await onImport(title, blocks);
    } catch (err) {
      alert(
        "Gagal membaca PDF: " +
          (err instanceof Error ? err.message : "berkas tidak didukung")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-600 transition hover:bg-slate-200 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span>{busy ? "⏳" : "⬆"}</span>
        <span>{busy ? "Mengimpor PDF…" : "Impor PDF"}</span>
      </button>
    </>
  );
}
