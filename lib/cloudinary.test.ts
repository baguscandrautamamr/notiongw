import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { uploadImage } from "@/lib/cloudinary";

// Minimal localStorage shim for the node test environment so the dedup cache
// has somewhere to persist between uploads.
function installLocalStorage() {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as unknown as { localStorage: typeof shim }).localStorage = shim;
  return store;
}

function makeFile(content: string): File {
  return new File([content], "img.png", { type: "image/png" });
}

function okResponse(url: string) {
  return {
    ok: true,
    json: async () => ({
      secure_url: url,
      public_id: "pid",
      width: 1,
      height: 1,
      format: "png",
      bytes: 1,
    }),
  } as unknown as Response;
}

describe("uploadImage dedup", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  });

  it("uploads once, then serves identical content from cache", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse("https://cdn/one.png"));
    vi.stubGlobal("fetch", fetchMock);

    const a = await uploadImage(makeFile("same-bytes"));
    const b = await uploadImage(makeFile("same-bytes"));

    expect(a.secure_url).toBe("https://cdn/one.png");
    expect(b.secure_url).toBe("https://cdn/one.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uploads separately for different content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse("https://cdn/a.png"))
      .mockResolvedValueOnce(okResponse("https://cdn/b.png"));
    vi.stubGlobal("fetch", fetchMock);

    const a = await uploadImage(makeFile("aaa"));
    const b = await uploadImage(makeFile("bbb"));

    expect(a.secure_url).toBe("https://cdn/a.png");
    expect(b.secure_url).toBe("https://cdn/b.png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent uploads of identical content into one request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(okResponse("https://cdn/one.png"));
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([
      uploadImage(makeFile("concurrent")),
      uploadImage(makeFile("concurrent")),
    ]);

    expect(a.secure_url).toBe("https://cdn/one.png");
    expect(b.secure_url).toBe("https://cdn/one.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
