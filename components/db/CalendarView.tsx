"use client";

import { useState } from "react";
import { type Database, firstTextFieldId } from "@/lib/db-types";
import { addField, visibleRows } from "@/lib/db-ops";
import RowDetail from "@/components/db/RowDetail";

type Update = (fn: (db: Database) => Database) => void;

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CalendarView({
  db,
  update,
}: {
  db: Database;
  update: Update;
}) {
  const dateField = db.fields.find((f) => f.type === "date");
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [openRow, setOpenRow] = useState<string | null>(null);

  if (!dateField) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="max-w-xs text-sm text-slate-500">
          Tampilan Kalender butuh kolom bertipe <b>Tanggal</b>.
        </p>
        <button
          onClick={() => update((d) => addField(d, "date"))}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          ＋ Tambah kolom Tanggal
        </button>
      </div>
    );
  }

  const titleId = firstTextFieldId(db.fields);
  const statusField = db.fields.find(
    (f) => f.id === db.groupByFieldId && f.type === "select"
  );

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const rows = visibleRows(db);
  const rowsOn = (d: Date) =>
    rows.filter((r) => (r.cells[dateField.id] as string) === iso(d));

  const todayIso = iso(new Date());

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setCursor(new Date(y, m - 1, 1))}
          className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ‹
        </button>
        <div className="min-w-[160px] text-center text-sm font-semibold">
          {MONTHS[m]} {y}
        </div>
        <button
          onClick={() => setCursor(new Date(y, m + 1, 1))}
          className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ›
        </button>
        <button
          onClick={() => {
            const n = new Date();
            setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
          }}
          className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Hari ini
        </button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        {DAYS.map((d) => (
          <div
            key={d}
            className="border-b border-slate-200 bg-slate-50 py-1.5 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === m;
          const isToday = iso(d) === todayIso;
          const dayRows = rowsOn(d);
          return (
            <div
              key={i}
              className={`min-h-[92px] border-b border-r border-slate-100 p-1 dark:border-slate-800/60 ${
                inMonth ? "" : "bg-slate-50/50 dark:bg-slate-900/40"
              }`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-brand-500 font-semibold text-white"
                    : inMonth
                    ? "text-slate-600 dark:text-slate-300"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayRows.map((r) => {
                  const title = titleId
                    ? (r.cells[titleId] as string) || "Tanpa judul"
                    : "Tanpa judul";
                  const opt = statusField?.options?.find(
                    (o) => o.id === r.cells[statusField.id]
                  );
                  return (
                    <button
                      key={r.id}
                      onClick={() => setOpenRow(r.id)}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-slate-700 hover:opacity-80 dark:text-slate-200"
                      style={{
                        backgroundColor: opt
                          ? undefined
                          : "rgba(148,163,184,0.18)",
                      }}
                      title={title}
                    >
                      • {title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openRow && (
        <RowDetail
          db={db}
          rowId={openRow}
          update={update}
          onClose={() => setOpenRow(null)}
        />
      )}
    </>
  );
}
