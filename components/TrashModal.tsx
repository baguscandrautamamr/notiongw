"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TrashItem = {
  id: string;
  title: string | null;
  icon: string;
  parent_id: string | null;
  updated_at: string;
};

export default function TrashModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  // Called after a restore/permanent-delete so the workspace can refresh.
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("id, title, icon, parent_id, updated_at")
      .not("deleted_at", "is", null)
      .order("updated_at", { ascending: false });
    setItems((data as TrashItem[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Restore the page plus any of its descendants that are also in the trash
  // (they were soft-deleted together).
  async function restore(id: string) {
    setBusy(id);
    const childrenOf = new Map<string, string[]>();
    for (const it of items) {
      if (it.parent_id) {
        const arr = childrenOf.get(it.parent_id) ?? [];
        arr.push(it.id);
        childrenOf.set(it.parent_id, arr);
      }
    }
    const ids: string[] = [];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      ids.push(cur);
      for (const child of childrenOf.get(cur) ?? []) stack.push(child);
    }
    await supabase.from("notes").update({ deleted_at: null }).in("id", ids);
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    setBusy(null);
    onChanged();
  }

  async function purge(id: string) {
    if (!confirm("Hapus permanen halaman ini? Tindakan ini tidak bisa dibatalkan."))
      return;
    setBusy(id);
    // FK "on delete cascade" also removes soft-deleted descendants.
    await supabase.from("notes").delete().eq("id", id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    setBusy(null);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            🗑️ Sampah
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-xs text-slate-400">
              Memuat…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-400">
              Sampah kosong.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="text-base leading-none">{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {it.title || "Tanpa judul"}
                  </span>
                  <button
                    disabled={busy === it.id}
                    onClick={() => restore(it.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-slate-800"
                  >
                    Pulihkan
                  </button>
                  <button
                    disabled={busy === it.id}
                    onClick={() => purge(it.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-slate-800"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
