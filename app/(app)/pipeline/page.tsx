import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  listEventCompanies,
  listTiersForEvent,
} from "@/lib/db/queries/companies";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/pipeline/kanban-board";

export default async function PipelinePage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [rows, tiers] = await Promise.all([
    listEventCompanies(activeEvent.id),
    listTiersForEvent(activeEvent.id),
  ]);

  const tierOptions = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {activeEvent.name} · {rows.length} prospects · drag a card to change
          its stage
        </p>
      </div>
      <KanbanBoard rows={rows} tiers={tierOptions} />
    </div>
  );
}
