export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-full animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800" />
            <div className="h-7 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
