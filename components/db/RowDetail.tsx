"use client";

import { type Database } from "@/lib/db-types";
import { deleteRow } from "@/lib/db-ops";
import { firstTextFieldId } from "@/lib/db-types";
import CellEditor from "@/components/db/CellEditor";

type Update = (fn: (db: Database) => Database) => void;

const TYPE_ICON: Record<string, string> = {
  text: "Aa",
  number: "#",
  select: "◉",
  checkbox: "☑",
  date: "📅",
  progress: "▰",
  checklist: "☑",
  person: "👤",
};

export default function RowDetail({
  db,
  rowId,
  update,
  onClose,
}: {
  db: Database;
  rowId: string;
  update: Update;
  onClose: () => void;
}) {
  const row = db.rows.find((r) => r.id === rowId);
  if (!row) return null;

  const titleId = firstTextFieldId(db.fields);
  const title = titleId ? ((row.cells[titleId] as string) || "") : "";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <span className="text-sm font-medium text-slate-500">Detail baris</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                update((d) => deleteRow(d, rowId));
                onClose();
              }}
              className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              🗑️ Hapus
            </button>
            <button
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto p-5">
          <h2 className="mb-4 text-2xl font-bold">
            {title || "Tanpa judul"}
          </h2>
          <div className="space-y-1">
            {db.fields.map((f) => (
              <div
                key={f.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex w-32 shrink-0 items-center gap-1.5 pt-1 text-sm text-slate-500">
                  <span className="text-slate-400">{TYPE_ICON[f.type]}</span>
                  <span className="truncate">{f.name}</span>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <CellEditor
                    field={f}
                    rowId={rowId}
                    value={row.cells[f.id]}
                    update={update}
                    variant="detail"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
