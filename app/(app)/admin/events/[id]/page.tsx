import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, listReviewersForEvent } from "@/lib/db/queries/events";
import { listUsers } from "@/lib/db/queries/users";
import { ReviewerPanel } from "@/components/admin/reviewer-panel";

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
        <div className="text-xs text-slate-500 dark:text-slate-400">Event</div>
        <h1 className="text-xl font-semibold tracking-tight">{event.name}</h1>
        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {event.slug}
        </p>
      </div>

      <ReviewerPanel
        eventId={event.id}
        reviewers={reviewers}
        candidates={allUsers.filter((u) => u.isActive)}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Configuration</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link
              href={`/admin/events/${event.id}/fields`}
              className="text-slate-700 hover:underline dark:text-slate-200"
            >
              Custom fields →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
