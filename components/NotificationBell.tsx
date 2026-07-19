"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (ok) currentPermission().then(setPermission);
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
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-50"
        aria-label="Notifikasi"
      >
        {permission === "granted" ? "🔔" : "🔕"}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          <p className="mt-1 text-xs text-slate-500">
            Dapatkan notifikasi push langsung di HP-mu.
          </p>

          {permission !== "granted" ? (
            <button
              onClick={handleEnable}
              disabled={busy}
              className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {busy ? "Memproses..." : "Aktifkan notifikasi"}
            </button>
          ) : (
            <button
              onClick={handleTest}
              disabled={busy}
              className="mt-3 w-full rounded-lg border border-brand-200 bg-brand-50 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60"
            >
              {busy ? "Mengirim..." : "Kirim notifikasi percobaan"}
            </button>
          )}

          {feedback && (
            <p className="mt-2 text-xs text-slate-600">{feedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
