"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/cloudinary";
import type { Note } from "@/lib/types";
import NotificationBell from "@/components/NotificationBell";

export default function NotesApp({
  initialNotes,
  userEmail,
}: {
  initialNotes: Note[];
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function resetForm() {
    setTitle("");
    setContent("");
    setFile(null);
    setPreview(null);
    setEditingId(null);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() && !content.trim() && !file) {
      setError("Isi judul atau catatan dulu ya.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | null =
        editingId != null
          ? notes.find((n) => n.id === editingId)?.image_url ?? null
          : null;

      if (file) {
        setUploading(true);
        const result = await uploadImage(file);
        imageUrl = result.secure_url;
        setUploading(false);
      }

      if (editingId) {
        const { data, error } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;
        setNotes((prev) =>
          prev.map((n) => (n.id === editingId ? (data as Note) : n))
        );
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesi berakhir, silakan masuk lagi.");

        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: title.trim(),
            content: content.trim(),
            image_url: imageUrl,
          })
          .select()
          .single();
        if (error) throw error;
        setNotes((prev) => [data as Note, ...prev]);
      }

      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan catatan.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setFile(null);
    setPreview(note.image_url);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== id));
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      setNotes(prev);
      alert("Gagal menghapus: " + error.message);
    }
    if (editingId === id) resetForm();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const filtered = notes.filter((n) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-xl shadow-md shadow-brand-500/30">
            📝
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">BagusNote</h1>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Composer */}
      <form
        onSubmit={handleSave}
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul catatan"
          className="w-full border-none bg-transparent text-lg font-semibold outline-none placeholder:text-slate-300"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis sesuatu..."
          rows={3}
          className="mt-1 w-full resize-none border-none bg-transparent text-sm outline-none placeholder:text-slate-300"
        />

        {preview && (
          <div className="relative mt-3 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Pratinjau"
              className="max-h-64 w-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white"
            >
              Hapus gambar
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            <span>🖼️</span>
            <span>Tambah gambar</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {uploading
                ? "Mengunggah..."
                : saving
                ? "Menyimpan..."
                : editingId
                ? "Perbarui"
                : "Simpan"}
            </button>
          </div>
        </div>
      </form>

      {/* Search */}
      {notes.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Cari catatan..."
          className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      )}

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          {notes.length === 0
            ? "Belum ada catatan. Tulis catatan pertamamu di atas!"
            : "Tidak ada catatan yang cocok."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {note.image_url && (
                <div className="relative aspect-video w-full bg-slate-100">
                  <Image
                    src={note.image_url}
                    alt={note.title || "Gambar catatan"}
                    fill
                    sizes="(max-width: 672px) 100vw, 672px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                {note.title && (
                  <h2 className="font-semibold">{note.title}</h2>
                )}
                {note.content && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {note.content}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {new Date(note.updated_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
