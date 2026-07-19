// Offload large inline (base64) images embedded in an Excalidraw scene to
// Cloudinary, replacing the data URL with the hosted URL. Without this, every
// pasted image is stored base64 inside the note's `doc` JSON in Supabase, which
// bloats the row and slows autosave. Excalidraw happily loads an https URL as a
// file `dataURL`, so swapping it is transparent to rendering.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { uploadImage, type CloudinaryResult } from "@/lib/cloudinary";

// Only bother offloading images bigger than this (base64 chars ≈ 1.37 × bytes).
// ~25 KB image → ~34k chars. Small icons stay inline to avoid upload churn.
const MIN_CHARS = 34_000;

function dataUrlToFile(dataURL: string, mimeType: string): File | null {
  try {
    const comma = dataURL.indexOf(",");
    if (comma < 0) return null;
    const base64 = dataURL.slice(comma + 1);
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = (mimeType.split("/")[1] || "png").replace("+xml", "");
    return new File([bytes], `whiteboard.${ext}`, { type: mimeType });
  } catch {
    return null;
  }
}

/**
 * Scan the scene's files, upload oversized inline images to Cloudinary, and
 * replace them in place via `api.addFiles`. Returns true if anything changed
 * (caller should let the resulting onChange persist the lighter scene).
 *
 * Failures are swallowed per-file: the original base64 is kept, so nothing is
 * ever lost when Cloudinary is unreachable or misconfigured.
 */
export async function offloadWhiteboardImages(
  api: any,
  uploader: (file: File) => Promise<CloudinaryResult> = uploadImage
): Promise<boolean> {
  if (!api?.getFiles || !api?.addFiles) return false;
  const files = api.getFiles() as Record<string, any>;
  const replacements: any[] = [];

  for (const id of Object.keys(files)) {
    const f = files[id];
    const url: string = f?.dataURL || "";
    const mime: string = f?.mimeType || "";
    if (!url.startsWith("data:")) continue; // already hosted
    if (!mime.startsWith("image/")) continue; // skip non-images
    if (url.length < MIN_CHARS) continue; // small enough to leave inline

    const file = dataUrlToFile(url, mime);
    if (!file) continue;
    try {
      const res = await uploader(file);
      replacements.push({ ...f, dataURL: res.secure_url });
    } catch {
      // keep the inline copy on failure
    }
  }

  if (replacements.length === 0) return false;
  api.addFiles(replacements);
  return true;
}
