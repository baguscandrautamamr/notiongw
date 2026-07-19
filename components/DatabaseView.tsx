"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note, NoteSummary } from "@/lib/types";
import {
  type Database,
  coerceDatabase,
  defaultDatabase,
} from "@/lib/db-types";
import { setView } from "@/lib/db-ops";
import EmojiPicker from "@/components/EmojiPicker";
import Breadcrumb from "@/components/Breadcrumb";
import GridView from "@/components/db/GridView";
import BoardView from "@/components/db/BoardView";
import CalendarView from "@/components/db/CalendarView";

type ViewKind = "grid" | "board" | "calendar";

export default function DatabaseView({
  noteId,
  notes,
  onSelect,
  onMetaChange,
}: {
  noteId: string;
  notes: NoteSummary[];
  onSelect: (id: string) => void;
  onMetaChange: (meta: Pick<NoteSummary, "id" | "title" | "icon">) => void;
}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🗂️");
  const [db, setDb] = useState<Database>(() => defaultDatabase());
  const [view, setViewKind] = useState<ViewKind>("grid");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);

  const dbRef = useRef<Database>(db);
  const titleRef = useRef(title);
  const iconRef = useRef(icon);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single();
      if (cancelled) return;
      const n = data as Note | null;
      setTitle(n?.title ?? "");
      setIcon(n?.icon ?? "🗂️");
      titleRef.current = n?.title ?? "";
      iconRef.current = n?.icon ?? "🗂️";
      const database = n?.db ? coerceDatabase(n.db) : defaultDatabase();
      setDb(database);
      dbRef.current = database;
      setViewKind(n?.type === "board" ? "board" : "grid");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, supabase]);

  const persist = useCallback(async () => {
    setStatus("saving");
    const { error } = await supabase
      .from("notes")
      .update({
        title: titleRef.current.trim(),
        icon: iconRef.current,
        db: dbRef.current,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);
    if (!error) {
      setStatus("saved");
      onMetaChange({
        id: noteId,
        title: titleRef.current.trim(),
        icon: iconRef.current,
      });
      setTimeout(() => setStatus("idle"), 1200);
    } else {
      setStatus("idle");
    }
  }, [noteId, supabase, onMetaChange]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 600);
  }, [persist]);

  const update = useCallback(
    (fn: (d: Database) => Database) => {
      setDb((prev) => {
        const next = fn(prev);
        dbRef.current = next;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  function handleTitle(v: string) {
    setTitle(v);
    titleRef.current = v;
    onMetaChange({ id: noteId, title: v, icon });
    scheduleSave();
  }
  function handleIcon(v: string) {
    setIcon(v);
    iconRef.current = v;
    setPickerOpen(false);
    onMetaChange({ id: noteId, title, icon: v });
    scheduleSave();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="fade-in mx-auto w-full max-w-5xl px-6 pb-16 pt-6 md:px-10">
      <div className="mb-2 flex items-center justify-between">
        <Breadcrumb notes={notes} activeId={noteId} onSelect={onSelect} />
        <span className="text-xs text-slate-400">
          {status === "saving"
            ? "Menyimpan…"
            : status === "saved"
            ? "Tersimpan ✓"
            : ""}
        </span>
      </div>

      {/* Icon + title */}
      <div className="relative inline-block">
        <button
          onClick={() => setPickerOpen((o) => !o)}
          className="rounded-lg p-1 text-4xl leading-none transition hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Ganti ikon"
        >
          {icon}
        </button>
        {pickerOpen && (
          <EmojiPicker onPick={handleIcon} onClose={() => setPickerOpen(false)} />
        )}
      </div>
      <textarea
        value={title}
        onChange={(e) => handleTitle(e.target.value)}
        placeholder="Tanpa judul"
        rows={1}
        className="mt-1 w-full resize-none border-none bg-transparent text-3xl font-bold leading-tight tracking-tight outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
      />

      {/* View tabs */}
      <div className="mb-3 mt-2 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["grid", "board", "calendar"] as ViewKind[]).map((v) => (
          <button
            key={v}
            onClick={() => setViewKind(v)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              view === v
                ? "border-brand-500 text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {v === "grid" ? "▦ Tabel" : v === "board" ? "▤ Board" : "📅 Kalender"}
          </button>
        ))}
      </div>

      {/* Filter / sort toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => update((d) => setView(d, { hideDone: !d.view.hideDone }))}
          className={`rounded-lg border px-2.5 py-1 transition ${
            db.view.hideDone
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-200"
              : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {db.view.hideDone ? "☑" : "☐"} Sembunyikan selesai
        </button>

        <div className="flex items-center gap-1">
          <span className="text-slate-400">Urut:</span>
          <select
            value={db.view.sortFieldId ?? ""}
            onChange={(e) =>
              update((d) =>
                setView(d, { sortFieldId: e.target.value || null })
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Manual</option>
            {db.fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {db.view.sortFieldId && (
            <button
              onClick={() =>
                update((d) =>
                  setView(d, {
                    sortDir: d.view.sortDir === "asc" ? "desc" : "asc",
                  })
                )
              }
              className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              title="Arah urutan"
            >
              {db.view.sortDir === "asc" ? "↑" : "↓"}
            </button>
          )}
        </div>
      </div>

      {view === "grid" ? (
        <GridView db={db} update={update} />
      ) : view === "board" ? (
        <BoardView db={db} update={update} />
      ) : (
        <CalendarView db={db} update={update} />
      )}
    </div>
  );
}
