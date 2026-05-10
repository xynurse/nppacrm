import Link from "next/link";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listEventCompanies } from "@/lib/db/queries/companies";
import { requireSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CompaniesTable } from "@/components/companies/companies-table";
import { CompanyDrawer } from "@/components/companies/company-drawer";

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

  const [rows, params] = await Promise.all([
    listEventCompanies(activeEvent.id),
    searchParams,
  ]);

  const recordId = typeof params.record === "string" ? params.record : null;
  const drawerRow = recordId
    ? (rows.find((r) => r.id === recordId) ?? null)
    : null;

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

      <CompaniesTable rows={rows} activeRecordId={recordId} />

      <CompanyDrawer row={drawerRow} />
    </div>
  );
}
