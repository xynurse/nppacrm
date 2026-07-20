"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { Event } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { updateEvent } from "@/lib/actions/events";

export function EventsTable({ events }: { events: Event[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Slug</th>
            <th className="px-4 py-2">Dates</th>
            <th className="px-4 py-2">Goal</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-zinc-900">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          {events.length === 0 ? (
            <tr>
              <td
                className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                colSpan={6}
              >
                No events yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ event }: { event: Event }) {
  const [pending, startTransition] = useTransition();
  const dates =
    event.startDate || event.endDate
      ? `${event.startDate ?? "—"} → ${event.endDate ?? "—"}`
      : "—";
  return (
    <tr>
      <td className="px-4 py-2 font-medium">
        <Link
          href={`/admin/events/${event.id}`}
          className="hover:underline"
        >
          {event.name}
        </Link>
      </td>
      <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
        {event.slug}
      </td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dates}</td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
        {event.fundraisingGoal
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: event.currency,
            }).format(Number(event.fundraisingGoal))
          : "—"}
      </td>
      <td className="px-4 py-2">
        <span
          className={
            event.status === "active"
              ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
              : "rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-zinc-800 dark:text-slate-300"
          }
        >
          {event.status}
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            const next = event.status === "active" ? "archived" : "active";
            startTransition(async () => {
              await updateEvent({ id: event.id, status: next });
            });
          }}
        >
          {event.status === "active" ? "Archive" : "Reactivate"}
        </Button>
      </td>
    </tr>
  );
}
