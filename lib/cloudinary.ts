// Unsigned Cloudinary upload from the browser.
// Cloud name and unsigned upload preset are public values (safe on the client).
//
// Uploads are content-deduplicated: before hitting Cloudinary we hash the file's
// bytes (SHA-256) and look the hash up in a localStorage cache. If the same
// image was uploaded before, we reuse the stored URL instead of uploading again.
// This keeps the Cloudinary quota from being burned by re-uploads of images that
// already exist (re-pasted images, repeated whiteboard offloads, re-saves, etc.).

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "spzbee49";
const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

export type CloudinaryResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

// ---------------------------------------------------------------------------
// Content-hash dedup cache (localStorage), keyed by SHA-256 of the file bytes.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = "cldn:img:"; // one entry per image hash
const CACHE_INDEX_KEY = "cldn:index"; // ordered list of cached hashes (oldest first)
const MAX_CACHE_ENTRIES = 500; // plenty for images; each entry is a tiny JSON blob

// De-dupe concurrent uploads of the *same* content within a single page load,
// so two near-simultaneous uploads (e.g. whiteboard offload firing twice) don't
// both hit Cloudinary before the cache is written.
const inflight = new Map<string, Promise<CloudinaryResult>>();

async function sha256Hex(file: File): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(digest);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  } catch {
    return null;
  }
}

function readCache(hash: string): CloudinaryResult | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_PREFIX + hash);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudinaryResult;
    return parsed?.secure_url ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(hash: string, result: CloudinaryResult): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify(result));

    // Maintain a bounded index so the cache can't grow without limit.
    let index: string[] = [];
    try {
      index = JSON.parse(localStorage.getItem(CACHE_INDEX_KEY) || "[]");
      if (!Array.isArray(index)) index = [];
    } catch {
      index = [];
    }
    index = index.filter((h) => h !== hash);
    index.push(hash);
    while (index.length > MAX_CACHE_ENTRIES) {
      const oldest = index.shift();
      if (oldest) localStorage.removeItem(CACHE_PREFIX + oldest);
    }
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // localStorage unavailable or quota exceeded — dedup just degrades to
    // always-upload; the upload itself already succeeded, so nothing is lost.
  }
}

async function rawUpload(file: File): Promise<CloudinaryResult> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    let message = `Cloudinary upload failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error?.message) message = err.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as CloudinaryResult;
}

export async function uploadImage(file: File): Promise<CloudinaryResult> {
  const hash = await sha256Hex(file);

  // No hashing available (very old browser / non-secure context) — fall back to
  // uploading directly so behaviour is never worse than before.
  if (!hash) return rawUpload(file);

  const cached = readCache(hash);
  if (cached) return cached;

  const pending = inflight.get(hash);
  if (pending) return pending;

  const p = rawUpload(file)
    .then((result) => {
      writeCache(hash, result);
      return result;
    })
    .finally(() => {
      inflight.delete(hash);
    });
  inflight.set(hash, p);
  return p;
}
