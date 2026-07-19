"use client";

// Offline-tolerant write queue for note updates.
//
// The app autosaves constantly. When the network is down, `updateNote` stores
// the pending patch in localStorage (coalescing repeated edits per note so the
// latest snapshot wins) and replays it once connectivity returns. Reads still
// come from the server, but no edit is silently lost while offline.

import type { SupabaseClient } from "@supabase/supabase-js";

const KEY = "bagusnote:pending-writes:v1";

type Patch = Record<string, unknown>;
type Queue = Record<string, Patch>; // noteId -> merged patch

function readQueue(): Queue {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Queue) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();

function writeQueue(queue: Queue): void {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(queue));
    } catch {
      /* storage full / unavailable — best effort */
    }
  }
  listeners.forEach((l) => l());
}

export function subscribePending(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function pendingCount(): number {
  return Object.keys(readQueue()).length;
}

function enqueue(id: string, patch: Patch): void {
  const queue = readQueue();
  queue[id] = { ...(queue[id] ?? {}), ...patch };
  writeQueue(queue);
}

function dequeue(id: string): void {
  const queue = readQueue();
  if (id in queue) {
    delete queue[id];
    writeQueue(queue);
  }
}

// Distinguish "we couldn't reach the server" (retry later) from real errors
// like RLS rejection (do not retry — it will never succeed).
function isRetryable(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg =
    typeof (err as { message?: unknown })?.message === "string"
      ? ((err as { message: string }).message).toLowerCase()
      : "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("fetch")
  );
}

export type WriteResult = { ok: boolean; queued: boolean };

export async function updateNote(
  supabase: SupabaseClient,
  id: string,
  patch: Patch
): Promise<WriteResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue(id, patch);
    return { ok: false, queued: true };
  }
  try {
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) {
      if (isRetryable(error)) {
        enqueue(id, patch);
        return { ok: false, queued: true };
      }
      return { ok: false, queued: false };
    }
    return { ok: true, queued: false };
  } catch (err) {
    if (isRetryable(err)) {
      enqueue(id, patch);
      return { ok: false, queued: true };
    }
    return { ok: false, queued: false };
  }
}

let flushing = false;

export async function flushQueue(supabase: SupabaseClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = readQueue();
    for (const [id, patch] of Object.entries(queue)) {
      try {
        const { error } = await supabase
          .from("notes")
          .update(patch)
          .eq("id", id);
        if (!error) {
          dequeue(id);
        } else if (isRetryable(error)) {
          break; // still offline — stop and retry the whole queue later
        } else {
          dequeue(id); // unrecoverable (e.g. row deleted) — drop it
        }
      } catch (err) {
        if (isRetryable(err)) break;
        dequeue(id);
      }
    }
  } finally {
    flushing = false;
  }
}

// Wire up automatic flushing: on reconnect, and periodically as a safety net.
export function initOfflineSync(supabase: SupabaseClient): () => void {
  const onOnline = () => void flushQueue(supabase);
  window.addEventListener("online", onOnline);
  void flushQueue(supabase);
  const interval = setInterval(() => {
    if (navigator.onLine !== false && pendingCount() > 0) {
      void flushQueue(supabase);
    }
  }, 15000);
  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(interval);
  };
}
