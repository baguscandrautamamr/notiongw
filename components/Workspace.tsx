"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteSummary, PageType } from "@/lib/types";
import { descendantIds, positionForIndex } from "@/lib/tree";
import { defaultDatabase } from "@/lib/db-types";
import { initOfflineSync, updateNote } from "@/lib/offline-queue";
import { useTheme } from "@/lib/use-theme";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import DatabaseView from "@/components/DatabaseView";
import Splash from "@/components/Splash";
import SearchModal from "@/components/SearchModal";
import TrashModal from "@/components/TrashModal";

const SUMMARY_COLS =
  "id, title, icon, type, parent_id, position, updated_at, is_favorite" as const;

function toSummary(row: Note): NoteSummary {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    type: row.type,
    parent_id: row.parent_id,
    position: row.position,
    updated_at: row.updated_at,
    is_favorite: row.is_favorite ?? false,
  };
}

const WhiteboardView = dynamic(() => import("@/components/WhiteboardView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="loadbar-track h-1.5 w-28 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="loadbar-fill" />
      </div>
    </div>
  ),
});

export type MoveMode = "before" | "after" | "child";

const TYPE_ICON: Record<PageType, string> = {
  document: "📝",
  grid: "🗂️",
  board: "📋",
  whiteboard: "🎨",
};

export default function Workspace({
  initialNotes,
  userEmail,
  userId,
}: {
  initialNotes: NoteSummary[];
  userEmail: string;
  userId: string;
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  // Re-fetch the (non-deleted) page list from the server. Used after
  // restoring/purging from the Trash.
  const refreshNotes = useCallback(async () => {
    const { data } = await supabase
      .from("notes")
      .select(SUMMARY_COLS)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (data) setNotes(data as NoteSummary[]);
  }, [supabase]);

  // Merge one row into the local summary list (add or replace).
  const upsertSummary = useCallback((row: Note) => {
    const summary = toSummary(row);
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === summary.id);
      if (idx === -1) return [...prev, summary];
      const next = [...prev];
      next[idx] = summary;
      return next;
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

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
          .select(SUMMARY_COLS)
          .single();

        if (!error && data) {
          const summary = toSummary(data as Note);
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
      if (!confirm("Pindahkan halaman ini (beserta sub-halamannya) ke Sampah?"))
        return;
      const toRemove = new Set<string>([id, ...descendantIds(notes, id)]);
      const prev = notes;
      const remaining = notes.filter((n) => !toRemove.has(n.id));
      setNotes(remaining);
      if (activeId && toRemove.has(activeId)) {
        setActiveId(remaining[0]?.id ?? null);
      }

      // Soft-delete: flag the whole subtree so it can be restored from Trash.
      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", [...toRemove]);

      if (!error) return;

      // The `deleted_at` column only exists after the schema migration has
      // been run. If it's missing, fall back to a permanent delete so the app
      // still works (FK cascade removes descendants).
      const missingColumn =
        error.code === "42703" ||
        error.code === "PGRST204" ||
        /deleted_at/i.test(error.message ?? "");

      if (missingColumn) {
        const { error: delErr } = await supabase
          .from("notes")
          .delete()
          .eq("id", id);
        if (delErr) {
          setNotes(prev);
          alert("Gagal menghapus halaman: " + delErr.message);
        }
        return;
      }

      setNotes(prev);
      alert("Gagal memindahkan ke Sampah: " + error.message);
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

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const current = notes.find((n) => n.id === id);
      if (!current) return;
      const next = !current.is_favorite;
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_favorite: next } : n))
      );
      const { ok, queued } = await updateNote(supabase, id, {
        is_favorite: next,
      });
      if (!ok && !queued) {
        // Revert on failure (e.g. is_favorite column not migrated yet).
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_favorite: !next } : n))
        );
      }
    },
    [notes, supabase]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: original } = await supabase
        .from("notes")
        .select("title, icon, type, doc, db, cover_url, content, parent_id")
        .eq("id", id)
        .single();
      if (!original) return;
      const src = original as Partial<Note>;

      const siblings = notes.filter((n) => n.parent_id === (src.parent_id ?? null));
      const position =
        siblings.length > 0 ? Math.max(...siblings.map((s) => s.position)) + 1 : 0;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: (src.title ? src.title + " " : "") + "(salinan)",
          icon: src.icon ?? "📄",
          type: src.type ?? "document",
          doc: src.doc ?? null,
          db: src.db ?? null,
          cover_url: src.cover_url ?? null,
          content: src.content ?? "",
          parent_id: src.parent_id ?? null,
          position,
        })
        .select(SUMMARY_COLS)
        .single();

      if (!error && data) {
        const summary = toSummary(data as Note);
        setNotes((prev) => [...prev, summary]);
        setActiveId(summary.id);
      }
    },
    [notes, supabase]
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
      // Cmd/Ctrl+K opens global full-text search.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live sync across devices/tabs via Supabase Realtime.
  useEffect(() => {
    const channel = supabase
      .channel(`notes:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            removeLocal((payload.old as { id: string }).id);
            return;
          }
          const row = payload.new as Note;
          if (row.deleted_at) removeLocal(row.id);
          else upsertSummary(row);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, upsertSummary, removeLocal]);

  // Flush offline edits when connectivity returns.
  useEffect(() => initOfflineSync(supabase), [supabase]);

  // Keep the active selection valid if the current page disappears
  // (deleted here or on another device).
  useEffect(() => {
    if (activeId && !notes.some((n) => n.id === activeId)) {
      setActiveId(notes[0]?.id ?? null);
    }
  }, [notes, activeId]);

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
    onToggleFavorite: handleToggleFavorite,
    onDuplicate: handleDuplicate,
    onToggleExpand: toggleExpand,
    onToggleTheme: toggle,
    onCloseMobile: () => setSidebarOpen(false),
    onOpenSearch: () => setSearchOpen(true),
    onOpenTrash: () => setTrashOpen(true),
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Splash />
      {searchOpen && (
        <SearchModal
          onSelect={handleSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {trashOpen && (
        <TrashModal
          onClose={() => setTrashOpen(false)}
          onChanged={refreshNotes}
        />
      )}
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

        <div
          className={`min-h-0 flex-1 ${
            activeNote?.type === "whiteboard"
              ? "overflow-hidden"
              : "scroll-area overflow-y-auto"
          }`}
        >
          {activeNote ? (
            activeNote.type === "grid" || activeNote.type === "board" ? (
              <DatabaseView
                key={activeNote.id}
                noteId={activeNote.id}
                notes={notes}
                onSelect={handleSelect}
                onMetaChange={handleMetaChange}
              />
            ) : activeNote.type === "whiteboard" ? (
              <WhiteboardView
                key={activeNote.id}
                noteId={activeNote.id}
                notes={notes}
                theme={theme}
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
                <button
                  onClick={() => handleNew(null, "whiteboard")}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  🎨 Whiteboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
