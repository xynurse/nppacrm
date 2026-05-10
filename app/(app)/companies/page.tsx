import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  listEventCompanies,
  listTiersForEvent,
} from "@/lib/db/queries/companies";
import { listContactsForCompany } from "@/lib/db/queries/contacts";
import { listInteractionsForEventCompany } from "@/lib/db/queries/interactions";
import {
  listReviewerIdsForEvent,
  listReviewsForEvent,
} from "@/lib/db/queries/reviews";
import { listTasksForEventCompany } from "@/lib/db/queries/tasks";
import { listUsers } from "@/lib/db/queries/users";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CompaniesTable } from "@/components/companies/companies-table";
import {
  CompanyDrawer,
  type DrawerData,
} from "@/components/companies/company-drawer";
import { QuickAddRow } from "@/components/companies/quick-add-row";

type SearchParams = Promise<{ record?: string }>;

export default async function CompaniesPage({
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
        <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [rows, tiers, users, params, reviewerIds, reviews] = await Promise.all([
    listEventCompanies(activeEvent.id),
    listTiersForEvent(activeEvent.id),
    listUsers(),
    searchParams,
    listReviewerIdsForEvent(activeEvent.id),
    listReviewsForEvent(activeEvent.id),
  ]);

  const owners = users
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));
  const tierOptions = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

  const recordId = typeof params.record === "string" ? params.record : null;
  const drawerRow = recordId
    ? (rows.find((r) => r.id === recordId) ?? null)
    : null;

  let drawerData: DrawerData | null = null;
  if (drawerRow) {
    const [contacts, interactions, tasks] = await Promise.all([
      listContactsForCompany(drawerRow.companyId),
      listInteractionsForEventCompany(drawerRow.id),
      listTasksForEventCompany(drawerRow.id),
    ]);
    drawerData = { contacts, interactions, tasks };
  }

  const reviewIndex = new Map<
    string,
    { yes: number; no: number; mine: "yes" | "no" | null }
  >();
  for (const row of rows) {
    reviewIndex.set(row.id, { yes: 0, no: 0, mine: null });
  }
  for (const r of reviews) {
    const entry = reviewIndex.get(r.eventCompanyId);
    if (!entry) continue;
    if (r.vote === "yes") entry.yes += 1;
    else entry.no += 1;
    if (r.reviewerId === session.user.id) entry.mine = r.vote;
  }
  const reviewSummaries = Object.fromEntries(reviewIndex.entries());

  const isReviewer = reviewerIds.includes(session.user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeEvent.name} · {rows.length} prospects
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <QuickAddRow eventId={activeEvent.id} />
      </div>

      <CompaniesTable
        rows={rows}
        owners={owners}
        tiers={tierOptions}
        activeRecordId={recordId}
        isAdmin={session.user.role === "admin"}
        reviewSummaries={reviewSummaries}
        reviewerCount={reviewerIds.length}
        isReviewer={isReviewer}
      />

      <CompanyDrawer
        row={drawerRow}
        owners={owners}
        tiers={tierOptions}
        data={drawerData}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "admin"}
      />
    </div>
  );
}
