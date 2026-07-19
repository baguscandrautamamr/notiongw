"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { NoteSummary } from "@/lib/types";
import NotificationBell from "@/components/NotificationBell";

export default function Sidebar({
  notes,
  activeId,
  userEmail,
  theme,
  onSelect,
  onNew,
  onDelete,
  onToggleTheme,
  onCloseMobile,
}: {
  notes: NoteSummary[];
  activeId: string | null;
  userEmail: string;
  theme: "light" | "dark";
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onToggleTheme: () => void;
  onCloseMobile: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");

  const filtered = notes.filter((n) =>
    (n.title || "Tanpa judul").toLowerCase().includes(query.trim().toLowerCase())
  );

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

      {/* Search */}
      <div className="px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari halaman…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-brand-500/20"
        />
      </div>

      {/* New page */}
      <div className="px-3 pb-1">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="text-base">＋</span> Halaman baru
        </button>
      </div>

      {/* Page list */}
      <nav className="scroll-area min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Halaman
        </div>
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-400">
            {notes.length === 0 ? "Belum ada halaman." : "Tidak ada yang cocok."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((n) => (
              <li key={n.id}>
                <div
                  className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                    activeId === n.id
                      ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
                      : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    onClick={() => onSelect(n.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-base leading-none">{n.icon}</span>
                    <span className="truncate">{n.title || "Tanpa judul"}</span>
                  </button>
                  <button
                    onClick={() => onDelete(n.id)}
                    className="rounded p-0.5 text-slate-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    aria-label="Hapus halaman"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>

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
