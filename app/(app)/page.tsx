import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  getDashboardMetrics,
  listMyOpenTasks,
  listRecentActivity,
  listStalledProspects,
} from "@/lib/db/queries/dashboard";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "@/components/companies/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

export default async function DashboardPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [metrics, stalled, recent, myTasks] = await Promise.all([
    getDashboardMetrics(activeEvent.id),
    listStalledProspects(activeEvent.id),
    listRecentActivity(activeEvent.id),
    listMyOpenTasks(activeEvent.id, session.user.id),
  ]);

  const goal = activeEvent.fundraisingGoal
    ? Number(activeEvent.fundraisingGoal)
    : null;
  const goalProgress =
    goal && goal > 0 ? Math.min(100, (metrics.confirmedAmount / goal) * 100) : 0;

  const pipelineAmount =
    metrics.proposedAmount + metrics.confirmedAmount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {activeEvent.name} ·{" "}
          {activeEvent.startDate
            ? `Starts ${activeEvent.startDate}`
            : "No start date set"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Building2 className="h-4 w-4" />}
          label="Total prospects"
          value={String(metrics.totalProspects)}
          href="/companies"
        />
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="Confirmed"
          value={formatCurrency(metrics.confirmedAmount)}
          sublabel={`${metrics.confirmedCount} sponsor${metrics.confirmedCount === 1 ? "" : "s"}`}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="In pipeline"
          value={formatCurrency(pipelineAmount)}
          sublabel="proposed + confirmed"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Stalled (30+ days)"
          value={String(stalled.length)}
          sublabel={stalled.length > 0 ? "Needs follow-up" : "None"}
        />
      </div>

      {goal ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-2 flex items-center justify-between text-sm">
            <h2 className="font-semibold">Fundraising goal</h2>
            <span className="text-slate-500 dark:text-slate-400">
              {formatCurrency(metrics.confirmedAmount)} /{" "}
              {formatCurrency(goal)} ({Math.round(goalProgress)}%)
            </span>
          </header>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Funnel by status</h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-9">
          {Object.entries(PROSPECT_STATUS_LABELS).map(([s]) => {
            const count = metrics.byStatus[s] ?? 0;
            return (
              <div
                key={s}
                className="space-y-1 rounded-md border border-slate-100 p-2 dark:border-slate-800"
              >
                <StatusBadge status={s as keyof typeof PROSPECT_STATUS_LABELS} />
                <p className="text-lg font-semibold tabular-nums">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Stalled prospects</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              30+ days, active statuses
            </span>
          </header>
          {stalled.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing stalled — keep it up.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {stalled.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2"
                >
                  <Link
                    href={`/companies?record=${s.id}`}
                    scroll={false}
                    className="truncate font-medium hover:underline"
                  >
                    {s.companyName}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {formatRelativeDate(s.lastContactedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">My open tasks</h2>
            <Link
              href="/tasks"
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              All tasks →
            </Link>
          </header>
          {myTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No open tasks.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {myTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{t.title}</span>
                    {t.companyName ? (
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        · {t.companyName}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {t.dueDate ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {a.type}
                  </span>
                  <Link
                    href={`/companies?record=${a.eventCompanyId}`}
                    scroll={false}
                    className="truncate font-medium hover:underline"
                  >
                    {a.companyName}
                  </Link>
                  {a.subject ? (
                    <span className="truncate text-slate-500 dark:text-slate-400">
                      — {a.subject}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {formatRelativeDate(a.occurredAt)}
                  {a.userName ? ` · ${a.userName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sublabel,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sublabel ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
