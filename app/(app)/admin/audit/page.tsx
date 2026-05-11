import { listEvents } from "@/lib/db/queries/events";
import { listUsers } from "@/lib/db/queries/users";
import {
  listAuditEntityTypes,
  listAuditLog,
  type AuditFilter,
} from "@/lib/db/queries/audit";
import { AuditFilters } from "@/components/admin/audit-filters";
import { AuditTable } from "@/components/admin/audit-table";

type SearchParams = Promise<{
  userId?: string;
  eventId?: string;
  entityType?: string;
  action?: string;
}>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanUuid(v: string | undefined): string | null {
  if (!v) return null;
  return UUID_RE.test(v) ? v : null;
}

function cleanString(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 || t.length > 200 ? null : t;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter: AuditFilter = {
    userId: cleanUuid(params.userId),
    eventId: cleanUuid(params.eventId),
    entityType: cleanString(params.entityType),
    action: cleanString(params.action),
  };

  const [rows, users, events, entityTypes] = await Promise.all([
    listAuditLog(filter),
    listUsers(),
    listEvents(),
    listAuditEntityTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Every mutation across the CRM. Showing the most recent 200 events
          matching your filters. Restore soft-deleted records inline.
        </p>
      </div>
      <AuditFilters
        users={users.map((u) => ({
          value: u.id,
          label: u.name ? `${u.name} (${u.email})` : u.email,
        }))}
        events={events.map((e) => ({ value: e.id, label: e.name }))}
        entityTypes={entityTypes.map((t) => ({ value: t, label: t }))}
        current={{
          userId: filter.userId ?? "",
          eventId: filter.eventId ?? "",
          entityType: filter.entityType ?? "",
          action: filter.action ?? "",
        }}
      />
      <AuditTable rows={rows} />
    </div>
  );
}
