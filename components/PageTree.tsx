"use client";

import { useState } from "react";
import type { NoteSummary, TreeNode } from "@/lib/types";
import { buildTree, descendantIds } from "@/lib/tree";
import type { MoveMode } from "@/components/Workspace";

type DropTarget = { id: string; mode: MoveMode } | null;

export default function PageTree({
  notes,
  activeId,
  expanded,
  onSelect,
  onNew,
  onDelete,
  onMove,
  onToggleExpand,
}: {
  notes: NoteSummary[];
  activeId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onNew: (parentId: string | null, type?: import("@/lib/types").PageType) => void;
  onDelete: (id: string) => void;
  onMove: (dragId: string, targetId: string, mode: MoveMode) => void;
  onToggleExpand: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget>(null);

  const tree = buildTree(notes);

  function canDrop(targetId: string): boolean {
    if (!dragId || dragId === targetId) return false;
    return !descendantIds(notes, dragId).has(targetId);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    if (!canDrop(targetId)) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const mode: MoveMode =
      ratio < 0.3 ? "before" : ratio > 0.7 ? "after" : "child";
    setDrop({ id: targetId, mode });
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (dragId && drop && drop.id === targetId && canDrop(targetId)) {
      onMove(dragId, targetId, drop.mode);
    }
    setDragId(null);
    setDrop(null);
  }

  const renderNode = (node: TreeNode, depth: number) => {
    const isActive = activeId === node.id;
    const isOpen = expanded.has(node.id);
    const hasChildren = node.children.length > 0;
    const dropHere = drop?.id === node.id ? drop.mode : null;

    return (
      <li key={node.id}>
        <div
          draggable
          onDragStart={(e) => {
            setDragId(node.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDrop={(e) => handleDrop(e, node.id)}
          onDragEnd={() => {
            setDragId(null);
            setDrop(null);
          }}
          style={{ paddingLeft: 8 + depth * 14 }}
          className={`group relative flex items-center gap-1 rounded-lg pr-1 text-sm transition ${
            isActive
              ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
              : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          } ${dropHere === "child" ? "ring-2 ring-inset ring-brand-400" : ""}`}
        >
          {/* drop line indicators */}
          {dropHere === "before" && (
            <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-brand-500" />
          )}
          {dropHere === "after" && (
            <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-brand-500" />
          )}

          {/* chevron / spacer */}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(node.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-300/50 dark:hover:bg-slate-700"
              aria-label={isOpen ? "Tutup" : "Buka"}
            >
              <span
                className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
              >
                ▸
              </span>
            </button>
          ) : (
            <span className="h-5 w-5 shrink-0" />
          )}

          {/* label */}
          <button
            onClick={() => onSelect(node.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
          >
            <span className="text-base leading-none">{node.icon}</span>
            <span className="truncate">{node.title || "Tanpa judul"}</span>
          </button>

          {/* hover actions */}
          <button
            onClick={() => onNew(node.id)}
            className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-300/50 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Sub-halaman baru"
            aria-label="Sub-halaman baru"
          >
            ＋
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
            title="Hapus"
            aria-label="Hapus"
          >
            🗑️
          </button>
        </div>

        {hasChildren && isOpen && (
          <ul className="mt-0.5 space-y-0.5">
            {node.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (tree.length === 0) {
    return <p className="px-2 py-2 text-xs text-slate-400">Belum ada halaman.</p>;
  }

  return <ul className="space-y-0.5">{tree.map((n) => renderNode(n, 0))}</ul>;
}
