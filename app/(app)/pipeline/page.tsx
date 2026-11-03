import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  listEventCompanies,
  listTiersForEvent,
} from "@/lib/db/queries/companies";
import { listFieldDefinitionsForEvent } from "@/lib/db/queries/custom-fields";
import { listUsers } from "@/lib/db/queries/users";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PipelineWorkspace } from "@/components/pipeline/pipeline-workspace";

type SearchParams = Promise<{ record?: string }>;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [session, params] = await Promise.all([
    requireSession(),
    searchParams,
  ]);
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [rows, tiers, users, fieldDefinitions] = await Promise.all([
    listEventCompanies(activeEvent.id),
    listTiersForEvent(activeEvent.id),
    listUsers(),
    listFieldDefinitionsForEvent(activeEvent.id),
  ]);

  const tierOptions = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));
  const owners = users
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const recordId = typeof params.record === "string" ? params.record : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pipeline
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {activeEvent.name} · {rows.length} prospects · drag a card to change
          its stage
        </p>
      </div>
      <PipelineWorkspace
        rows={rows}
        owners={owners}
        tiers={tierOptions}
        initialRecordId={recordId}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "admin"}
        fieldDefinitions={fieldDefinitions}
      />
    </div>
  );
}
