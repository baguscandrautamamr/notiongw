"use client";

import { useEffect, useRef, useState } from "react";
import {
  pushSupported,
  subscribeToPush,
  currentPermission,
  sendTestNotification,
} from "@/lib/push-client";

export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (ok) currentPermission().then(setPermission);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleEnable() {
    setBusy(true);
    setFeedback(null);
    try {
      await subscribeToPush();
      setPermission("granted");
      setFeedback("Notifikasi aktif! ✅");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Gagal mengaktifkan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setFeedback(null);
    try {
      await sendTestNotification();
      setFeedback("Notifikasi percobaan dikirim! 📲");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg px-2.5 py-2 text-sm transition hover:bg-slate-200 dark:hover:bg-slate-800"
        aria-label="Notifikasi"
        title="Notifikasi"
      >
        {permission === "granted" ? "🔔" : "🔕"}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dapatkan notifikasi push langsung di HP-mu.
          </p>

          {permission !== "granted" ? (
            <button
              onClick={handleEnable}
              disabled={busy}
              className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {busy ? "Memproses…" : "Aktifkan notifikasi"}
            </button>
          ) : (
            <button
              onClick={handleTest}
              disabled={busy}
              className="mt-3 w-full rounded-lg border border-brand-200 bg-brand-50 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-200 dark:hover:bg-slate-700"
            >
              {busy ? "Mengirim…" : "Kirim notifikasi percobaan"}
            </button>
          )}

          {feedback && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
