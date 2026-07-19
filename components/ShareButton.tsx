"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ShareButton({ noteId }: { noteId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/share/${noteId}`);
  }, [noteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notes")
        .select("is_public")
        .eq("id", noteId)
        .single();
      if (!cancelled && data) setIsPublic(Boolean(data.is_public));
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId, supabase]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    const { error } = await supabase
      .from("notes")
      .update({ is_public: next })
      .eq("id", noteId);
    if (!error) setIsPublic(next);
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
          isPublic
            ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-200"
            : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {isPublic ? "🌐 Dibagikan" : "🔗 Share"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Bagikan ke publik</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Siapa pun dengan link bisa melihat (baca-saja).
              </p>
            </div>
            <button
              onClick={() => toggle(!isPublic)}
              disabled={busy}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                isPublic ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
              aria-label="Aktifkan share"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  isPublic ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {isPublic && (
            <div className="mt-3 flex items-center gap-1">
              <input
                readOnly
                value={url}
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                onClick={copy}
                className="shrink-0 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
              >
                {copied ? "✓" : "Salin"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
