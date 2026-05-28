import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/db/queries/events";
import {
  getAgentSchedule,
  listAgentRuns,
  listPendingSuggestions,
} from "@/lib/db/queries/agents";
import { AgentsPanel } from "@/components/admin/agents-panel";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [event, discoverySchedule, suggestions, runs] = await Promise.all([
    getEventById(id),
    getAgentSchedule(id, "discovery"),
    listPendingSuggestions(id),
    listAgentRuns(id),
  ]);

  if (!event) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          ← {event.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          AI Agents
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Automated discovery of new sponsorship candidates. Run manually or
          enable for scheduled runs (coming soon).
        </p>
      </div>

      <AgentsPanel
        eventId={id}
        discoveryEnabled={discoverySchedule?.enabled ?? false}
        lastRunAt={discoverySchedule?.lastRunAt ?? null}
        suggestions={suggestions}
        runs={runs}
      />
    </div>
  );
}
