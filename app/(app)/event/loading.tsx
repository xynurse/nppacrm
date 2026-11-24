export default function EventLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200/80" />
        <div className="h-8 w-72 animate-pulse rounded-md bg-zinc-200/80" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-zinc-200 p-4"
          >
            <div className="h-4 w-36 animate-pulse rounded bg-zinc-200/80" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-100" />
            <div className="h-16 animate-pulse rounded-md bg-zinc-100" />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-200/80" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-zinc-100"
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"
          />
        ))}
      </div>
    </div>
  );
}
