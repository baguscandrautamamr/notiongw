"use client";

// Per-device fallback store for "favorite" flags, so the feature works even
// before the `is_favorite` column has been added by the schema migration.
// When the column exists, the server is authoritative and this simply mirrors
// it; when it doesn't, this keeps favorites working locally.

const KEY = "bagusnote:favorites:v1";

function read(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

function write(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable — best effort */
  }
}

export function getLocalFavorites(): Set<string> {
  return read();
}

export function setLocalFavorite(id: string, favorite: boolean): void {
  const ids = read();
  if (favorite) ids.add(id);
  else ids.delete(id);
  write(ids);
}
