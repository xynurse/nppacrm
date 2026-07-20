export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
      <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded bg-slate-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
