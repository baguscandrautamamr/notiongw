export default function Loading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl shadow-lg shadow-brand-500/30">
          📝
        </div>
        <div className="loadbar-track h-1.5 w-28 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="loadbar-fill" />
        </div>
      </div>
    </div>
  );
}
