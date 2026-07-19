"use client";

import { useEffect, useState } from "react";

// A brief branded loading screen shown when the app opens. Because a PWA
// launches from cache (so the server route loader may not appear), this
// client splash guarantees a visible "opening" state every time.
export default function Splash() {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 650);
    const t2 = setTimeout(() => setGone(true), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-300 dark:bg-slate-950 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl shadow-lg shadow-brand-500/30">
          📝
        </div>
        <div className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          BagusNote
        </div>
        <div className="loadbar-track h-1.5 w-32 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="loadbar-fill" />
        </div>
      </div>
    </div>
  );
}
