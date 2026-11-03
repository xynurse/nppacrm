"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Event } from "@/lib/db/schema";
import { setActiveEvent } from "@/lib/actions/events";
/**
 * Active-event picker. Light chrome only (Attio/Twenty shell).
 * `tone` is accepted for call-site compatibility; dark is no longer used.
 */
export function EventSwitcher({
  events,
  activeEventId,
  tone: _tone = "light",
  id,
}: {
  events: Event[];
  activeEventId: string | null;
  tone?: "dark" | "light";
  id?: string;
}) {
  void _tone;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <select
        id={id}
        aria-label="Active event"
        className="w-full cursor-pointer appearance-none rounded-md border border-zinc-200 bg-white px-3 py-1.5 pr-7 text-xs text-zinc-900 transition-colors hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
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
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400"
        aria-hidden
      />
    </div>
  );
}
