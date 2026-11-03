import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, listReviewersForEvent } from "@/lib/db/queries/events";
import { listUsers } from "@/lib/db/queries/users";
import { ReviewerPanel } from "@/components/admin/reviewer-panel";
import { RolloverEventForm } from "@/components/admin/rollover-event-form";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, reviewers, allUsers] = await Promise.all([
    getEventById(id),
    listReviewersForEvent(id),
    listUsers(),
  ]);

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-zinc-500">Event</div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900">
          {event.name}
        </h1>
        <p className="font-mono text-xs text-zinc-500">{event.slug}</p>
      </div>

      <ReviewerPanel
        eventId={event.id}
        reviewers={reviewers}
        candidates={allUsers.filter((u) => u.isActive)}
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Configuration</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link
              href={`/admin/events/${event.id}/fields`}
              className="text-zinc-700 hover:underline"
            >
              Custom fields →
            </Link>
          </li>
          <li>
            <Link
              href={`/admin/events/${event.id}/tiers`}
              className="text-zinc-700 hover:underline"
            >
              Sponsorship tiers →
            </Link>
          </li>
          <li>
            <Link
              href={`/admin/events/${event.id}/import`}
              className="text-zinc-700 hover:underline"
            >
              Import prospects (CSV) →
            </Link>
          </li>
          <li>
            <Link
              href={`/admin/events/${event.id}/prospectus`}
              className="text-zinc-700 hover:underline"
            >
              Sponsorship prospectus (PDF for AI grounding) →
            </Link>
          </li>
          <li>
            <Link
              href={`/admin/events/${event.id}/agents`}
              className="text-zinc-700 hover:underline"
            >
              AI agents (Discovery) →
            </Link>
          </li>
        </ul>
      </section>

      <RolloverEventForm
        sourceEventId={event.id}
        sourceName={event.name}
        sourceSlug={event.slug}
        currency={event.currency}
        timezone={event.timezone}
        fundraisingGoal={event.fundraisingGoal}
      />
    </div>
  );
}
