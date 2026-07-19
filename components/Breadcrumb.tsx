"use client";

import type { NoteSummary } from "@/lib/types";

export default function Breadcrumb({
  notes,
  activeId,
  onSelect,
}: {
  notes: NoteSummary[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const chain: NoteSummary[] = [];
  let cur: NoteSummary | undefined = byId.get(activeId);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      {chain.map((n, i) => (
        <span key={n.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
          <button
            onClick={() => onSelect(n.id)}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
              i === chain.length - 1
                ? "font-medium text-slate-700 dark:text-slate-200"
                : ""
            }`}
          >
            <span>{n.icon}</span>
            <span className="max-w-[160px] truncate">
              {n.title || "Tanpa judul"}
            </span>
          </button>
        </span>
      ))}
    </nav>
  );
}
