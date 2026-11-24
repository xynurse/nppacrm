import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getEventById } from "@/lib/db/queries/events";
import {
  agentsSchemaMissing,
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

  const [
    event,
    discoverySchedule,
    watchSchedule,
    suggestions,
    runs,
    schemaMissing,
  ] = await Promise.all([
    getEventById(id),
    getAgentSchedule(id, "discovery"),
    getAgentSchedule(id, "watch"),
    listPendingSuggestions(id),
    listAgentRuns(id),
    agentsSchemaMissing(),
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
        <h1 className="mt-1 font-display text-xl font-semibold tracking-tight">
          AI Agents
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Automated discovery of new sponsorship candidates and signal
          monitoring of existing prospects. Run manually or enable for scheduled
          daily runs.
        </p>
      </div>

      {schemaMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Agents tables are not in this database yet (
          <code className="font-mono text-xs">agent_schedules</code>). Run{" "}
          <code className="font-mono text-xs">pnpm db:migrate</code> against
          production (migration <code className="font-mono text-xs">0009</code>
          ) and refresh. Until then the page stays up but schedules / runs are
          empty.
        </div>
      ) : null}

      <AgentsPanel
        eventId={id}
        discoveryEnabled={discoverySchedule?.enabled ?? false}
        lastRunAt={discoverySchedule?.lastRunAt ?? null}
        watchEnabled={watchSchedule?.enabled ?? false}
        watchLastRunAt={watchSchedule?.lastRunAt ?? null}
        suggestions={suggestions}
        runs={runs}
      />
    </div>
  );
}
