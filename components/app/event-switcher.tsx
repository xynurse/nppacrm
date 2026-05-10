"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/db/schema";
import { Select } from "@/components/ui/select";
import { setActiveEvent } from "@/lib/actions/events";

export function EventSwitcher({
  events,
  activeEventId,
}: {
  events: Event[];
  activeEventId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (events.length === 0) {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        No events yet
      </span>
    );
  }

  return (
    <Select
      className="h-8 w-56 text-sm"
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
    </Select>
  );
}
