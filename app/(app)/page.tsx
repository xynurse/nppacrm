import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  DollarSign,
  Flame,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  getDashboardMetrics,
  listHotProspects,
  listMyOpenTasks,
  listRecentActivity,
  listStalledProspects,
  listTierMix,
} from "@/lib/db/queries/dashboard";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "@/components/companies/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const STATUS_ORDER = Object.keys(PROSPECT_STATUS_LABELS) as Array<
  keyof typeof PROSPECT_STATUS_LABELS
>;

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

  const [metrics, stalled, recent, myTasks, hotProspects, tierMix] =
    await Promise.all([
      getDashboardMetrics(activeEvent.id),
      listStalledProspects(activeEvent.id),
      listRecentActivity(activeEvent.id),
      listMyOpenTasks(activeEvent.id, session.user.id),
      listHotProspects(activeEvent.id),
      listTierMix(activeEvent.id),
    ]);

  const goal = activeEvent.fundraisingGoal
    ? Number(activeEvent.fundraisingGoal)
    : null;
  const goalProgress =
    goal && goal > 0 ? Math.min(100, (metrics.confirmedAmount / goal) * 100) : 0;

  const pipelineAmount = metrics.proposedAmount + metrics.confirmedAmount;

  // Build funnel data with conversion % between stages
  const funnelStages = STATUS_ORDER.map((s) => ({
    status: s,
    count: metrics.byStatus[s] ?? 0,
  }));
  const maxCount = Math.max(...funnelStages.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {activeEvent.name}
          {activeEvent.startDate ? ` · starts ${activeEvent.startDate}` : ""}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Building2 className="h-4 w-4" />}
          label="Total prospects"
          value={String(metrics.totalProspects)}
          href="/companies"
          accent="default"
        />
        <Kpi
          icon={<DollarSign className="h-4 w-4" />}
          label="Confirmed revenue"
          value={formatCurrency(metrics.confirmedAmount)}
          sublabel={`${metrics.confirmedCount} sponsor${metrics.confirmedCount !== 1 ? "s" : ""}`}
          accent="green"
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Pipeline value"
          value={formatCurrency(pipelineAmount)}
          sublabel="proposed + confirmed"
          accent="blue"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Stalled (30+ days)"
          value={String(stalled.length)}
          sublabel={stalled.length > 0 ? "Needs follow-up" : "All good"}
          accent={stalled.length > 0 ? "amber" : "default"}
        />
      </div>

      {/* Goal progress */}
      {goal ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-400" />
              <span className="font-semibold">Fundraising goal</span>
            </div>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">
              {formatCurrency(metrics.confirmedAmount)} /{" "}
              {formatCurrency(goal)}
              <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round(goalProgress)}%
              </span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          {goal - metrics.confirmedAmount > 0 ? (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {formatCurrency(goal - metrics.confirmedAmount)} remaining to goal
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Goal reached!
            </p>
          )}
        </section>
      ) : null}

      {/* Funnel bar chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold">Pipeline funnel</h2>
        <div className="space-y-2">
          {funnelStages
            .filter((f) => f.count > 0)
            .map((f) => {
              const pct = Math.round((f.count / maxCount) * 100);
              return (
                <div key={f.status} className="flex items-center gap-3">
                  <Link
                    href={`/companies?v=${encodeURIComponent(JSON.stringify({ filter: { op: "and", conditions: [{ field: "status", op: "eq", value: f.status }] } }))}`}
                    scroll={false}
                    className="w-28 shrink-0"
                  >
                    <StatusBadge status={f.status} />
                  </Link>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm bg-brand-500/70 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
                      {f.count}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* Tier mix + Hot prospects */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier mix */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Confirmed by tier</h2>
          </div>
          {tierMix.length === 0 ? (
            <p className="text-sm text-slate-500">No confirmed sponsors yet.</p>
          ) : (
            <div className="space-y-2">
              {tierMix.map((t) => (
                <div key={t.tierName} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.tierColor ?? "#94a3b8" }}
                  />
                  <span className="flex-1 font-medium">{t.tierName}</span>
                  <span className="tabular-nums text-slate-500">
                    {t.confirmedCount}×
                  </span>
                  <span className="w-20 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(t.confirmedAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Hot prospects */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold">Hot prospects</h2>
            <span className="ml-auto text-xs text-slate-500">
              High priority, active stage
            </span>
          </div>
          {hotProspects.length === 0 ? (
            <p className="text-sm text-slate-500">
              No high-priority active prospects.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {hotProspects.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.targetTierColor ?? "#94a3b8" }}
                  />
                  <Link
                    href={`/companies?record=${p.id}`}
                    scroll={false}
                    className="flex-1 truncate font-medium hover:underline"
                  >
                    {p.companyName}
                  </Link>
                  <StatusBadge status={p.status} />
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatRelativeDate(p.lastContactedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Stalled + My tasks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Stalled prospects</h2>
            <Link
              href="/companies?filter=stalled"
              className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              View all →
            </Link>
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

        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
            <p className="text-sm text-slate-500">No open tasks assigned to you.</p>
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

      {/* Recent activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 py-2 text-sm"
              >
                {/* User avatar */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold uppercase text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {a.userName ? a.userName.slice(0, 2) : "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
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
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {formatRelativeDate(a.occurredAt)}
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
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  href?: string;
  accent?: "default" | "green" | "blue" | "amber";
}) {
  const accentCls = {
    default: "text-slate-500",
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[accent];

  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${accentCls}`}>
        {value}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90 transition-opacity">
      {body}
    </Link>
  ) : (
    body
  );
}
