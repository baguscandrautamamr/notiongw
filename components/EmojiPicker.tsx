"use client";

import { useEffect, useRef } from "react";

const EMOJIS = [
  "📄","📝","📌","📎","🗒️","📔","📓","📚","✅","⭐","🔥","💡",
  "🎯","🚀","💰","📅","🧠","❤️","😀","🎉","🍀","🌈","☕","🎵",
  "🏠","🛒","✈️","⚽","🎮","🐱","🌻","🔑",
];

export default function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onPick(e)}
            className="rounded-md p-1 text-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
