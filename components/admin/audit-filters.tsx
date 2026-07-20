import Link from "next/link";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string };

export function AuditFilters({
  users,
  events,
  entityTypes,
  current,
}: {
  users: Option[];
  events: Option[];
  entityTypes: Option[];
  current: {
    userId: string;
    eventId: string;
    entityType: string;
    action: string;
  };
}) {
  const hasFilters =
    current.userId || current.eventId || current.entityType || current.action;

  return (
    <form
      method="get"
      action="/admin/audit"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-zinc-900"
    >
      <Field label="User">
        <select
          name="userId"
          defaultValue={current.userId}
          className="h-9 w-44 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-zinc-900"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Event">
        <select
          name="eventId"
          defaultValue={current.eventId}
          className="h-9 w-44 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-zinc-900"
        >
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Entity">
        <select
          name="entityType"
          defaultValue={current.entityType}
          className="h-9 w-44 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-zinc-900"
        >
          <option value="">All entities</option>
          {entityTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Action">
        <input
          type="text"
          name="action"
          defaultValue={current.action}
          placeholder="eventCompany.update"
          className="h-9 w-52 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-zinc-900"
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit">Apply</Button>
        {hasFilters ? (
          <Link href="/admin/audit">
            <Button type="button" variant="ghost">
              Clear
            </Button>
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
