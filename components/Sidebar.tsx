"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NoteSummary, PageType } from "@/lib/types";
import type { MoveMode } from "@/components/Workspace";
import type { PartialBlock } from "@blocknote/core";
import { pendingCount, subscribePending } from "@/lib/offline-queue";
import NotificationBell from "@/components/NotificationBell";
import PageTree from "@/components/PageTree";
import NewPageButton from "@/components/NewPageButton";
import ImportPdfButton from "@/components/ImportPdfButton";

export default function Sidebar({
  notes,
  activeId,
  expanded,
  userEmail,
  theme,
  onSelect,
  onNew,
  onDelete,
  onMove,
  onToggleFavorite,
  onDuplicate,
  onImportPdf,
  onToggleExpand,
  onToggleTheme,
  onCloseMobile,
  onOpenSearch,
  onOpenTrash,
}: {
  notes: NoteSummary[];
  activeId: string | null;
  expanded: Set<string>;
  userEmail: string;
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onNew: (parentId: string | null, type?: PageType) => void;
  onDelete: (id: string) => void;
  onMove: (dragId: string, targetId: string, mode: MoveMode) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onImportPdf: (title: string, blocks: PartialBlock[]) => void | Promise<void>;
  onToggleExpand: (id: string) => void;
  onToggleTheme: () => void;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setPending(pendingCount());
    return subscribePending(() => setPending(pendingCount()));
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q
    ? notes.filter((n) => (n.title || "Tanpa judul").toLowerCase().includes(q))
    : [];

  const favorites = notes.filter((n) => n.is_favorite);
  const recent = [...notes]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0))
    .slice(0, 5);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-lg shadow-sm">
          📝
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">BagusNote</div>
          <div className="truncate text-xs text-slate-400">{userEmail}</div>
        </div>
        <button
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 md:hidden"
          aria-label="Tutup menu"
        >
          ✕
        </button>
      </div>

      {/* Search: quick title filter + global full-text button */}
      <div className="space-y-1.5 px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter judul…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-brand-500/20"
        />
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
        >
          <span>🔎</span>
          <span className="flex-1 text-left">Cari isi semua halaman</span>
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] dark:border-slate-600">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* New page + import */}
      <div className="px-3 pb-1">
        <NewPageButton onNew={(type) => onNew(null, type)} />
        <ImportPdfButton onImport={onImportPdf} />
      </div>

      {/* Page list / tree */}
      <nav className="scroll-area min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {/* Favorites & Recent (hidden while filtering) */}
        {!q && favorites.length > 0 && (
          <>
            <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              ⭐ Favorit
            </div>
            <ul className="space-y-0.5">
              {favorites.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onSelect(n.id)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      activeId === n.id
                        ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
                        : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-base leading-none">{n.icon}</span>
                    <span className="truncate">{n.title || "Tanpa judul"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!q && recent.length > 0 && (
          <>
            <div className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              🕒 Terkini
            </div>
            <ul className="space-y-0.5">
              {recent.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onSelect(n.id)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      activeId === n.id
                        ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
                        : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-base leading-none">{n.icon}</span>
                    <span className="truncate">{n.title || "Tanpa judul"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {q ? "Hasil pencarian" : "Halaman"}
        </div>

        {q ? (
          matches.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">Tidak ada yang cocok.</p>
          ) : (
            <ul className="space-y-0.5">
              {matches.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onSelect(n.id)}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      activeId === n.id
                        ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
                        : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-base leading-none">{n.icon}</span>
                    <span className="truncate">{n.title || "Tanpa judul"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <PageTree
            notes={notes}
            activeId={activeId}
            expanded={expanded}
            onSelect={onSelect}
            onNew={onNew}
            onDelete={onDelete}
            onMove={onMove}
            onToggleFavorite={onToggleFavorite}
            onDuplicate={onDuplicate}
            onToggleExpand={onToggleExpand}
          />
        )}
      </nav>

      {/* Offline indicator */}
      {pending > 0 && (
        <div className="mx-2 mb-1 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <span>⏳</span>
          <span>{pending} perubahan menunggu koneksi…</span>
        </div>
      )}

      {/* Footer controls */}
      <div className="flex items-center gap-1 border-t border-slate-200 px-2 py-2 dark:border-slate-800">
        <NotificationBell />
        <button
          onClick={onToggleTheme}
          className="rounded-lg px-2.5 py-2 text-sm transition hover:bg-slate-200 dark:hover:bg-slate-800"
          title="Ganti tema"
          aria-label="Ganti tema"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button
          onClick={onOpenTrash}
          className="rounded-lg px-2.5 py-2 text-sm transition hover:bg-slate-200 dark:hover:bg-slate-800"
          title="Sampah"
          aria-label="Sampah"
        >
          🗑️
        </button>
        <div className="flex-1" />
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
