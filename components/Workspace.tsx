"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NoteSummary } from "@/lib/types";
import { useTheme } from "@/lib/use-theme";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";

export default function Workspace({
  initialNotes,
  userEmail,
}: {
  initialNotes: NoteSummary[];
  userEmail: string;
}) {
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const [notes, setNotes] = useState<NoteSummary[]>(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(
    initialNotes[0]?.id ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNew = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: "", icon: "📝", doc: null })
        .select("id, title, icon, updated_at")
        .single();

      if (!error && data) {
        const summary = data as NoteSummary;
        setNotes((prev) => [summary, ...prev]);
        setActiveId(summary.id);
        setSidebarOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }, [creating, supabase]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Hapus halaman ini?")) return;
      const prev = notes;
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (activeId === id) setActiveId(remaining[0]?.id ?? null);

      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) setNotes(prev);
    },
    [notes, activeId, supabase]
  );

  const handleMetaChange = useCallback(
    (meta: Pick<NoteSummary, "id" | "title" | "icon">) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === meta.id ? { ...n, title: meta.title, icon: meta.icon } : n
        )
      );
    },
    []
  );

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  // Close drawer with Escape on mobile
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 md:block">
        <Sidebar
          notes={notes}
          activeId={activeId}
          userEmail={userEmail}
          theme={theme}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          onToggleTheme={toggle}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85%] border-r border-slate-200 shadow-xl dark:border-slate-800">
            <Sidebar
              notes={notes}
              activeId={activeId}
              userEmail={userEmail}
              theme={theme}
              onSelect={handleSelect}
              onNew={handleNew}
              onDelete={handleDelete}
              onToggleTheme={toggle}
              onCloseMobile={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Buka menu"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">BagusNote</span>
        </div>

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto">
          {activeId ? (
            <Editor
              key={activeId}
              noteId={activeId}
              theme={theme}
              onMetaChange={handleMetaChange}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="text-6xl">📝</div>
              <h2 className="mt-4 text-lg font-semibold">
                Selamat datang di BagusNote
              </h2>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Buat halaman pertamamu. Ketik <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">/</kbd>{" "}
                di dalam dokumen untuk menyisipkan heading, checklist, gambar,
                dan lainnya.
              </p>
              <button
                onClick={handleNew}
                className="mt-5 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                ＋ Halaman baru
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
