"use client";

import { useState } from "react";
import { type Database, firstTextFieldId } from "@/lib/db-types";
import { addField, addRow, setCell, visibleRows } from "@/lib/db-ops";
import { OptionChip } from "@/components/db/SelectCell";
import { PersonChip } from "@/components/db/PersonCell";
import RowDetail from "@/components/db/RowDetail";

type Update = (fn: (db: Database) => Database) => void;

export default function BoardView({
  db,
  update,
}: {
  db: Database;
  update: Update;
}) {
  const [dragRow, setDragRow] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | "none" | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const groupField = db.fields.find(
    (f) => f.id === db.groupByFieldId && f.type === "select"
  );
  const titleId = firstTextFieldId(db.fields);

  if (!groupField) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="max-w-xs text-sm text-slate-500">
          Tampilan Board mengelompokkan kartu berdasarkan kolom{" "}
          <b>Pilihan</b> (mis. Status). Belum ada kolom seperti itu.
        </p>
        <button
          onClick={() => update((d) => addField(d, "select"))}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          ＋ Tambah kolom Status
        </button>
      </div>
    );
  }

  const options = groupField.options ?? [];
  // Column keys: each option, then a trailing "no value" column.
  const columns: { key: string | "none"; label: React.ReactNode }[] = [
    ...options.map((o) => ({
      key: o.id,
      label: <OptionChip option={o} />,
    })),
    {
      key: "none" as const,
      label: (
        <span className="text-xs font-medium text-slate-400">
          Tanpa {groupField.name}
        </span>
      ),
    },
  ];

  const rowsFor = (key: string | "none") =>
    visibleRows(db).filter((r) => {
      const v = (r.cells[groupField.id] as string) ?? null;
      return key === "none" ? !v : v === key;
    });

  const otherSelects = db.fields.filter(
    (f) => f.type === "select" && f.id !== groupField.id
  );
  const checkboxes = db.fields.filter((f) => f.type === "checkbox");
  const progressFields = db.fields.filter((f) => f.type === "progress");
  const personFields = db.fields.filter((f) => f.type === "person");

  const drop = (key: string | "none") => {
    if (dragRow) {
      const value = key === "none" ? null : key;
      update((d) => setCell(d, dragRow, groupField.id, value));
    }
    setDragRow(null);
    setDropCol(null);
  };

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => {
          const rows = rowsFor(col.key);
          const active = dropCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDropCol(col.key);
              }}
              onDrop={() => drop(col.key)}
              className={`flex w-72 shrink-0 flex-col rounded-xl p-2 transition ${
                active
                  ? "bg-brand-50 dark:bg-slate-800"
                  : "bg-slate-100/70 dark:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="flex items-center gap-2">
                  {col.label}
                  <span className="text-xs text-slate-400">{rows.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {rows.map((row) => {
                  const title = titleId
                    ? (row.cells[titleId] as string) || "Tanpa judul"
                    : "Tanpa judul";
                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => {
                        setDragRow(row.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragRow(null);
                        setDropCol(null);
                      }}
                      onClick={() => setOpenRow(row.id)}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-1 text-sm font-medium">{title}</div>
                      {progressFields.map((f) => {
                        const n = Math.max(
                          0,
                          Math.min(100, Math.round(Number(row.cells[f.id]) || 0))
                        );
                        return (
                          <div
                            key={f.id}
                            className="mb-1.5 flex items-center gap-2"
                          >
                            <div className="relative h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                                style={{ width: `${n}%` }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-slate-400">
                              {n}%
                            </span>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap items-center gap-1">
                        {personFields.map((f) => {
                          const opt = (f.options ?? []).find(
                            (o) => o.id === row.cells[f.id]
                          );
                          return opt ? (
                            <PersonChip key={f.id} option={opt} />
                          ) : null;
                        })}
                        {otherSelects.map((f) => {
                          const opt = (f.options ?? []).find(
                            (o) => o.id === row.cells[f.id]
                          );
                          return opt ? (
                            <OptionChip key={f.id} option={opt} />
                          ) : null;
                        })}
                        {checkboxes.map((f) =>
                          row.cells[f.id] ? (
                            <span
                              key={f.id}
                              className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-500/20 dark:text-green-300"
                            >
                              ✓ {f.name}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  update((d) =>
                    addRow(d, {
                      ...(col.key !== "none"
                        ? { [groupField.id]: col.key }
                        : {}),
                    })
                  )
                }
                className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-white/70 dark:hover:bg-slate-800"
              >
                ＋ Baru
              </button>
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
