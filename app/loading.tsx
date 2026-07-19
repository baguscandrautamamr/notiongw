export default function Loading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-2xl shadow-lg shadow-brand-500/30">
          📝
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}
