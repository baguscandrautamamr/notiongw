"use client";

import dynamic from "next/dynamic";
import type { PartialBlock } from "@blocknote/core";
import type { Note } from "@/lib/types";
import { coerceDatabase, checklistPercent, asChecklist } from "@/lib/db-types";
import { visibleRows } from "@/lib/db-ops";
import { OptionChip } from "@/components/db/SelectCell";
import { PersonChip } from "@/components/db/PersonCell";
import { useTheme } from "@/lib/use-theme";

const BlockNoteEditor = dynamic(() => import("@/components/BlockNoteEditor"), {
  ssr: false,
});
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

function ReadonlyDatabase({ note }: { note: Note }) {
  const db = coerceDatabase(note.db);
  const rows = visibleRows(db);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            {db.fields.map((f) => (
              <th
                key={f.id}
                className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-500"
              >
                {f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-100 dark:border-slate-800/60"
            >
              {db.fields.map((f) => {
                const v = r.cells[f.id];
                let content: React.ReactNode = null;
                if (f.type === "checkbox") {
                  content = v ? "✅" : "⬜";
                } else if (f.type === "select") {
                  const o = f.options?.find((x) => x.id === v);
                  content = o ? <OptionChip option={o} /> : null;
                } else if (f.type === "person") {
                  const o = f.options?.find((x) => x.id === v);
                  content = o ? <PersonChip option={o} /> : null;
                } else if (f.type === "progress") {
                  const n = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
                  content = (
                    <div className="flex items-center gap-2">
                      <div className="relative h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                          style={{ width: `${n}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{n}%</span>
                    </div>
                  );
                } else if (f.type === "checklist") {
                  const items = asChecklist(v);
                  content = `${items.filter((i) => i.done).length}/${items.length} (${checklistPercent(v)}%)`;
                } else {
                  content = (v as string) ?? "";
                }
                return (
                  <td key={f.id} className="px-3 py-2 align-middle">
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PublicPage({ note }: { note: Note }) {
  const { theme } = useTheme();

  if (note.type === "whiteboard") {
    const scene = (note.doc as { elements?: unknown[]; files?: unknown }) ?? {};
    return (
      <div className="flex h-[100dvh] flex-col">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <span className="text-2xl">{note.icon}</span>
          <span className="text-lg font-bold">{note.title || "Tanpa judul"}</span>
          <span className="ml-auto text-xs text-slate-400">
            Dibagikan · baca-saja
          </span>
        </div>
        <div className="relative min-h-0 flex-1">
          <Excalidraw
            theme={theme}
            viewModeEnabled
            initialData={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              elements: (scene.elements as any) ?? [],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              files: (scene.files as any) ?? {},
              scrollToContent: true,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">
          Dibagikan · baca-saja
        </span>
        <span className="text-xs text-slate-400">BagusNote</span>
      </div>
      <div className="text-5xl">{note.icon}</div>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        {note.title || "Tanpa judul"}
      </h1>
      <div className="mt-4">
        {note.type === "grid" || note.type === "board" ? (
          <ReadonlyDatabase note={note} />
        ) : (
          <BlockNoteEditor
            initialContent={(note.doc as PartialBlock[] | null) ?? undefined}
            onChange={() => {}}
            theme={theme}
            editable={false}
          />
        )}
      </div>
    </div>
  );
}
