"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Event } from "@/lib/db/schema";
import { setActiveEvent } from "@/lib/actions/events";
import { cn } from "@/lib/cn";

/**
 * Active-event picker. `tone="dark"` matches the zinc-950 sidebar;
 * `tone="light"` is for normal surfaces (the mobile More sheet).
 */
export function EventSwitcher({
  events,
  activeEventId,
  tone = "light",
  id,
}: {
  events: Event[];
  activeEventId: string | null;
  tone?: "dark" | "light";
  id?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <select
        id={id}
        aria-label="Active event"
        className={cn(
          "w-full cursor-pointer appearance-none rounded-md border px-3 py-1.5 pr-7 text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50",
          tone === "dark"
            ? "border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]"
            : "border-zinc-200 bg-white py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
        )}
        value={activeEventId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value || null;
          startTransition(async () => {
            await setActiveEvent({ eventId: value });
            router.refresh();
          });
        }}
      >
        {events.map((event) => (
          <option
            key={event.id}
            value={event.id}
            className={tone === "dark" ? "bg-zinc-950 text-white" : undefined}
          >
            {event.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2",
          tone === "dark" ? "text-zinc-400" : "text-zinc-500",
        )}
        aria-hidden
      />
    </div>
  );
}
