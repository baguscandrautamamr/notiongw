"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NoteSummary, PageType } from "@/lib/types";
import { descendantIds, positionForIndex } from "@/lib/tree";
import { defaultDatabase } from "@/lib/db-types";
import { useTheme } from "@/lib/use-theme";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import DatabaseView from "@/components/DatabaseView";

export type MoveMode = "before" | "after" | "child";

const TYPE_ICON: Record<PageType, string> = {
  document: "📝",
  grid: "🗂️",
  board: "📋",
};

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleNew = useCallback(
    async (parentId: string | null = null, type: PageType = "document") => {
      if (creating) return;
      setCreating(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const siblings = notes.filter((n) => n.parent_id === parentId);
        const position =
          siblings.length > 0
            ? Math.max(...siblings.map((s) => s.position)) + 1
            : 0;

        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: "",
            icon: TYPE_ICON[type],
            type,
            doc: null,
            db: type === "document" ? null : defaultDatabase(),
            parent_id: parentId,
            position,
          })
          .select("id, title, icon, type, parent_id, position, updated_at")
          .single();

        if (!error && data) {
          const summary = data as NoteSummary;
          setNotes((prev) => [...prev, summary]);
          setActiveId(summary.id);
          if (parentId) {
            setExpanded((prev) => new Set(prev).add(parentId));
          }
          setSidebarOpen(false);
        }
      } finally {
        setCreating(false);
      }
    },
    [creating, notes, supabase]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Hapus halaman ini beserta sub-halamannya?")) return;
      const toRemove = new Set<string>([id, ...descendantIds(notes, id)]);
      const prev = notes;
      const remaining = notes.filter((n) => !toRemove.has(n.id));
      setNotes(remaining);
      if (activeId && toRemove.has(activeId)) {
        setActiveId(remaining[0]?.id ?? null);
      }

      // FK "on delete cascade" removes descendants server-side too.
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) setNotes(prev);
    },
    [notes, activeId, supabase]
  );

  const handleMove = useCallback(
    async (dragId: string, targetId: string, mode: MoveMode) => {
      if (dragId === targetId) return;
      // Never move a page into itself or its own descendants.
      const blocked = descendantIds(notes, dragId);
      if (blocked.has(targetId)) return;

      const target = notes.find((n) => n.id === targetId);
      if (!target) return;

      let newParent: string | null;
      let newPosition: number;

      if (mode === "child") {
        newParent = targetId;
        const siblings = notes
          .filter((n) => n.parent_id === targetId && n.id !== dragId)
          .sort((a, b) => a.position - b.position);
        newPosition =
          siblings.length > 0
            ? siblings[siblings.length - 1].position + 1
            : 0;
      } else {
        newParent = target.parent_id;
        const siblings = notes
          .filter((n) => n.parent_id === newParent && n.id !== dragId)
          .sort((a, b) => a.position - b.position);
        const targetIndex = siblings.findIndex((s) => s.id === targetId);
        const insertAt = mode === "before" ? targetIndex : targetIndex + 1;
        newPosition = positionForIndex(siblings, insertAt);
      }

      const prev = notes;
      setNotes((cur) =>
        cur.map((n) =>
          n.id === dragId
            ? { ...n, parent_id: newParent, position: newPosition }
            : n
        )
      );
      if (mode === "child") {
        setExpanded((p) => new Set(p).add(targetId));
      }

      const { error } = await supabase
        .from("notes")
        .update({ parent_id: newParent, position: newPosition })
        .eq("id", dragId);
      if (error) setNotes(prev);
    },
    [notes, supabase]
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

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeNote = notes.find((n) => n.id === activeId) ?? null;

  const sidebarProps = {
    notes,
    activeId,
    expanded,
    userEmail,
    theme,
    onSelect: handleSelect,
    onNew: handleNew,
    onDelete: handleDelete,
    onMove: handleMove,
    onToggleExpand: toggleExpand,
    onToggleTheme: toggle,
    onCloseMobile: () => setSidebarOpen(false),
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 md:block">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85%] border-r border-slate-200 shadow-xl dark:border-slate-800">
            <Sidebar {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
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
          {activeNote ? (
            activeNote.type === "grid" || activeNote.type === "board" ? (
              <DatabaseView
                key={activeNote.id}
                noteId={activeNote.id}
                notes={notes}
                onSelect={handleSelect}
                onMetaChange={handleMetaChange}
              />
            ) : (
              <Editor
                key={activeNote.id}
                noteId={activeNote.id}
                notes={notes}
                theme={theme}
                onSelect={handleSelect}
                onMetaChange={handleMetaChange}
                onCreateSubpage={handleNew}
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="text-6xl">📝</div>
              <h2 className="mt-4 text-lg font-semibold">
                Selamat datang di BagusNote
              </h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Buat halaman pertamamu. Pilih jenis halaman:
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => handleNew(null, "document")}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  📝 Dokumen
                </button>
                <button
                  onClick={() => handleNew(null, "grid")}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  🗂️ Tabel (Grid)
                </button>
                <button
                  onClick={() => handleNew(null, "board")}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  📋 Board (Kanban)
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
