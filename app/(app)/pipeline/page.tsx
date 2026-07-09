import Link from "next/link";
import {
  getActiveProspectus,
  listRecentJobsForEventCompany,
  listSuggestionsForEventCompany,
} from "@/lib/db/queries/ai";
import { listBenefitsForEventCompany } from "@/lib/db/queries/benefits";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  listEventCompanies,
  listTiersForEvent,
} from "@/lib/db/queries/companies";
import {
  listContactsForCompany,
  listEmailHistoryForCompany,
} from "@/lib/db/queries/contacts";
import { listFieldDefinitionsForEvent } from "@/lib/db/queries/custom-fields";
import { listInteractionsForEventCompany } from "@/lib/db/queries/interactions";
import { listTasksForEventCompany } from "@/lib/db/queries/tasks";
import { listUsers } from "@/lib/db/queries/users";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CompanyDrawer,
  type DrawerData,
} from "@/components/companies/company-drawer";
import { KanbanBoard } from "@/components/pipeline/kanban-board";

type SearchParams = Promise<{ record?: string }>;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const params = await searchParams;

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
  const drawerRow = recordId
    ? (rows.find((r) => r.id === recordId) ?? null)
    : null;

  let drawerData: DrawerData | null = null;
  if (drawerRow) {
    const [
      contacts,
      emailHistory,
      interactions,
      tasks,
      suggestions,
      jobs,
      prospectus,
      benefits,
    ] = await Promise.all([
      listContactsForCompany(drawerRow.companyId),
      listEmailHistoryForCompany(drawerRow.companyId),
      listInteractionsForEventCompany(drawerRow.id),
      listTasksForEventCompany(drawerRow.id),
      listSuggestionsForEventCompany(drawerRow.id),
      listRecentJobsForEventCompany(drawerRow.id, 5),
      getActiveProspectus(activeEvent.id),
      listBenefitsForEventCompany(drawerRow.id),
    ]);
    drawerData = {
      contacts,
      emailHistory,
      interactions,
      tasks,
      ai: {
        suggestions,
        jobs,
        hasProspectus: !!prospectus,
        prospectusFileName: prospectus?.fileName ?? null,
      },
      benefits,
    };
  }

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

      <CompanyDrawer
        row={drawerRow}
        owners={owners}
        tiers={tierOptions}
        data={drawerData}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "admin"}
        fieldDefinitions={fieldDefinitions}
        closeHref="/pipeline"
      />
    </div>
  );
}
