import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Gift,
  Target,
  Users as UsersIcon,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listActiveEvents, listReviewersForEvent } from "@/lib/db/queries/events";
import { listTiersForEvent } from "@/lib/db/queries/companies";
import { getDashboardMetrics } from "@/lib/db/queries/dashboard";
import {
  getAverageDaysInStage,
  getCadenceBreakdown,
  getOwnerLeaderboard,
  getRevenueRollup,
  getTierMix,
} from "@/lib/db/queries/reports";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "@/components/companies/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { encodeToParam } from "@/lib/views/schema";
import type { FilterCondition } from "@/lib/views/types";

const STATUS_ORDER = Object.keys(PROSPECT_STATUS_LABELS) as Array<
  keyof typeof PROSPECT_STATUS_LABELS
>;

function companiesHref(conditions: FilterCondition[]): string {
  return `/companies?f=${encodeToParam({ op: "and", conditions })}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export default async function EventProfilePage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Event</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No active event. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const isAdmin = session.user.role === "admin";
  const [
    revenue,
    metrics,
    tierMix,
    leaderboard,
    cadence,
    daysInStage,
    reviewers,
    tiers,
  ] = await Promise.all([
    getRevenueRollup(activeEvent.id),
    getDashboardMetrics(activeEvent.id),
    getTierMix(activeEvent.id),
    getOwnerLeaderboard(activeEvent.id),
    getCadenceBreakdown(activeEvent.id),
    getAverageDaysInStage(activeEvent.id),
    listReviewersForEvent(activeEvent.id),
    listTiersForEvent(activeEvent.id),
  ]);

  const currency = revenue.currency;
  const pctOfGoal = revenue.pctOfGoal ?? 0;
  const startCountdown = daysUntil(activeEvent.startDate);

  const activeCadenceTotal = cadence.ok + cadence.amber + cadence.red;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            Event profile
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {activeEvent.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span>
              {activeEvent.startDate ? formatDate(activeEvent.startDate) : "TBD"}
              {activeEvent.endDate ? ` – ${formatDate(activeEvent.endDate)}` : ""}
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>{activeEvent.timezone}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="capitalize">{activeEvent.status}</span>
            {startCountdown !== null ? (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span
                  className={
                    startCountdown >= 0
                      ? "font-medium text-brand-600 dark:text-brand-400"
                      : "text-slate-500"
                  }
                >
                  {startCountdown > 0
                    ? `${startCountdown} days out`
                    : startCountdown === 0
                      ? "Today"
                      : `${Math.abs(startCountdown)} days ago`}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {isAdmin ? (
          <Link href={`/admin/events/${activeEvent.id}`}>
            <Button variant="outline" size="sm">
              Manage event
            </Button>
          </Link>
        ) : null}
      </div>

      {/* Fundraising / revenue */}
      <section className="surface-card p-4 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold">Fundraising target</h2>
        </div>
        {revenue.fundraisingGoal ? (
          <>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(revenue.confirmedAmount, currency)} confirmed of{" "}
                {formatCurrency(revenue.fundraisingGoal, currency)} goal
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round(pctOfGoal * 100)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, pctOfGoal * 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            No fundraising goal set.{" "}
            {isAdmin ? (
              <Link
                href={`/admin/events/${activeEvent.id}`}
                className="text-brand-600 hover:underline dark:text-brand-400"
              >
                Set one →
              </Link>
            ) : null}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Confirmed"
            value={formatCurrency(revenue.confirmedAmount, currency)}
            sub={`${revenue.confirmedCount} sponsor${revenue.confirmedCount !== 1 ? "s" : ""}`}
            accent="green"
            href={companiesHref([
              { field: "status", op: "is", value: "confirmed" },
            ])}
          />
          <Stat
            label="Expected (in flight)"
            value={formatCurrency(revenue.expectedAmount, currency)}
            sub="proposal → committed"
            accent="blue"
          />
          <Stat
            label="Total proposed"
            value={formatCurrency(revenue.proposedAmount, currency)}
            sub="all open proposals"
          />
          <Stat
            label="Gap to goal"
            value={
              revenue.gapToGoal === null
                ? "—"
                : formatCurrency(Math.max(0, revenue.gapToGoal), currency)
            }
            sub={
              revenue.gapToGoal !== null && revenue.gapToGoal <= 0
                ? "Goal reached!"
                : "remaining"
            }
            accent="amber"
          />
        </div>
      </section>

      {/* Pipeline distribution */}
      <section className="surface-card p-4 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold">
            Prospects by stage · {metrics.totalProspects} total
          </h2>
          <Link
            href="/pipeline"
            className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Open pipeline →
          </Link>
        </div>
        <div className="space-y-2">
          {STATUS_ORDER.map((status) => {
            const count = metrics.byStatus[status] ?? 0;
            const pct =
              metrics.totalProspects > 0
                ? Math.round((count / metrics.totalProspects) * 100)
                : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <Link
                  href={companiesHref([
                    { field: "status", op: "is", value: status },
                  ])}
                  className="w-28 shrink-0"
                >
                  <StatusBadge status={status} />
                </Link>
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bg-brand-500/70 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tiers & targets */}
        <section className="surface-card p-4 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Gift className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Sponsorship tiers &amp; targets</h2>
            {isAdmin ? (
              <Link
                href={`/admin/events/${activeEvent.id}/tiers`}
                className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
              >
                Edit tiers →
              </Link>
            ) : null}
          </div>
          {tiers.length === 0 ? (
            <p className="text-sm text-slate-500">No tiers configured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-1.5 font-medium">Tier</th>
                  <th className="pb-1.5 text-right font-medium">Suggested</th>
                  <th className="pb-1.5 text-right font-medium">Targeted</th>
                  <th className="pb-1.5 text-right font-medium">Confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tierMix.map((t) => (
                  <tr key={t.tierId ?? t.tierName}>
                    <td className="py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.tierColor ?? "#94a3b8" }}
                        />
                        <span className="font-medium">{t.tierName}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {t.suggestedAmount
                        ? formatCurrency(t.suggestedAmount, currency)
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {t.targetCount}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {t.confirmedCount}
                      {t.confirmedAmount > 0
                        ? ` · ${formatCurrency(t.confirmedAmount, currency)}`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Team leaderboard */}
        <section className="surface-card p-4 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Team leaderboard</h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">
              No prospects assigned to owners yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-1.5 font-medium">Owner</th>
                  <th className="pb-1.5 text-right font-medium">Cos.</th>
                  <th className="pb-1.5 text-right font-medium">Conf.</th>
                  <th className="pb-1.5 text-right font-medium">Confirmed $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((o) => (
                  <tr key={o.userId}>
                    <td className="py-1.5 font-medium">{o.name}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {o.companies}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {o.confirmedCount}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(o.confirmedAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Outreach cadence health */}
        <section className="surface-card p-4 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Outreach health</h2>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {activeCadenceTotal} active prospects
            </span>
          </div>
          {activeCadenceTotal === 0 ? (
            <p className="text-sm text-slate-500">No active prospects.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(cadence.ok / activeCadenceTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${(cadence.amber / activeCadenceTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(cadence.red / activeCadenceTotal) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {cadence.ok} on track (&lt;14d)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {cadence.amber} cooling (14–30d)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {cadence.red} stalled (30d+ / never)
                </span>
              </div>
            </>
          )}
        </section>

        {/* Avg days in stage */}
        <section className="surface-card p-4 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold">Average days in current stage</h2>
          </div>
          {daysInStage.every((d) => d.count === 0) ? (
            <p className="text-sm text-slate-500">No prospects yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {daysInStage
                .filter((d) => d.count > 0)
                .map((d) => (
                  <li
                    key={d.status}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-slate-400">
                        {d.count} in stage
                      </span>
                    </span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      {d.avgDays === null ? "—" : `${d.avgDays}d avg`}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>

      {/* Reviewers */}
      <section className="surface-card p-4 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold">Review panel</h2>
          {isAdmin ? (
            <Link
              href={`/admin/events/${activeEvent.id}`}
              className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
            >
              Manage reviewers →
            </Link>
          ) : null}
        </div>
        {reviewers.length === 0 ? (
          <p className="text-sm text-slate-500">No reviewers assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {reviewers.map((r) => (
              <span
                key={r.userId}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-slate-400">{r.email}</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = "default",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "default" | "green" | "blue" | "amber";
  href?: string;
}) {
  const accentCls = {
    default: "text-slate-700 dark:text-slate-200",
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[accent];

  const body = (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accentCls}`}>
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}
