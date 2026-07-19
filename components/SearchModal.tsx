"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Result = {
  id: string;
  title: string | null;
  icon: string;
  content: string | null;
};

// PostgREST .or() treats commas/parentheses as syntax; strip characters that
// would break the filter (and % which is the ilike wildcard).
function sanitize(q: string): string {
  return q.replace(/[,()%\\]/g, " ").trim();
}

function snippet(content: string | null, q: string): string | null {
  if (!content) return null;
  const idx = content.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return content.slice(0, 90) + (content.length > 90 ? "…" : "");
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + q.length + 60);
  return (
    (start > 0 ? "…" : "") +
    content.slice(start, end) +
    (end < content.length ? "…" : "")
  );
}

export default function SearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = sanitize(query);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const filter = `title.ilike.%${q}%,content.ilike.%${q}%`;
      const primary = await supabase
        .from("notes")
        .select("id, title, icon, content")
        .is("deleted_at", null)
        .or(filter)
        .order("updated_at", { ascending: false })
        .limit(30);
      // Fall back without the deleted_at filter if the migration isn't applied.
      const data = primary.error
        ? (
            await supabase
              .from("notes")
              .select("id, title, icon, content")
              .or(filter)
              .order("updated_at", { ascending: false })
              .limit(30)
          ).data
        : primary.data;
      if (cancelled) return;
      setResults((data as Result[]) ?? []);
      setActive(0);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, supabase]);

  function choose(id: string) {
    onSelect(id);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      choose(results[active].id);
    }
  }

  const q = sanitize(query);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
          <span className="text-slate-400">🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul & isi semua halaman…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        <div className="scroll-area max-h-[50vh] overflow-y-auto p-1.5">
          {q.length < 2 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Ketik minimal 2 huruf untuk mencari.
            </p>
          ) : loading ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Mencari…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Tidak ada hasil untuk “{q}”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((r, i) => {
                const snip = snippet(r.content, q);
                return (
                  <li key={r.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(r.id)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                        i === active
                          ? "bg-brand-50 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="mt-0.5 text-base leading-none">
                        {r.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.title || "Tanpa judul"}
                        </span>
                        {snip && (
                          <span className="block truncate text-xs text-slate-400">
                            {snip}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
