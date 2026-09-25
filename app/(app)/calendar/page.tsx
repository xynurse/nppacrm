import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import { listTasksForEvent } from "@/lib/db/queries/tasks";
import { formatRelativeDate } from "@/lib/format";
import { PriorityDot } from "@/components/companies/priority-dot";
import { cn } from "@/lib/cn";

function monthKey(d: string | null): string {
  if (!d) return "no-due";
  return d.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  if (key === "no-due") return "No due date";
  const [y, m] = key.split("-");
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CalendarPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Calendar
        </h1>
        <p className="text-sm text-zinc-500">No active event.</p>
      </div>
    );
  }

  const tasks = await listTasksForEvent(activeEvent.id, { onlyOpen: true });
  const grouped = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const k = monthKey(t.dueDate);
    const list = grouped.get(k) ?? [];
    list.push(t);
    grouped.set(k, list);
  }

  const keys = [...grouped.keys()].sort((a, b) => {
    if (a === "no-due") return 1;
    if (b === "no-due") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Calendar
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {activeEvent.name} · open tasks by due date
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-zinc-500">
          No open tasks. Create one from a company drawer or the Tasks page.
        </div>
      ) : (
        keys.map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="font-display text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {monthLabel(key)}
            </h2>
            <ul className="surface-card divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800">
              {(grouped.get(key) ?? []).map((t) => {
                const overdue =
                  t.dueDate &&
                  t.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 px-4 py-3 text-sm"
                  >
                    <PriorityDot priority={t.priority} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {t.companyName ? (
                          t.eventCompanyId ? (
                            <Link
                              href={`/companies?record=${t.eventCompanyId}`}
                              className="hover:underline"
                            >
                              {t.companyName}
                            </Link>
                          ) : (
                            t.companyName
                          )
                        ) : (
                          "No company"
                        )}
                        {t.assigneeName ? ` · ${t.assigneeName}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs tabular-nums",
                        overdue
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-zinc-500",
                      )}
                    >
                      {t.dueDate
                        ? formatRelativeDate(new Date(t.dueDate + "T12:00:00Z"))
                        : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
