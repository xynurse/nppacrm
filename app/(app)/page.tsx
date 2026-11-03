import Link from "next/link";
import { CheckSquare, Flame } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  getDashboardMetrics,
  listHotProspects,
  listMyOpenTasks,
  listRecentActivity,
  listStalledProspects,
} from "@/lib/db/queries/dashboard";
import {
  BOUNCED_TAG,
  DEFERRED_TAG,
  StatusBadge,
} from "@/components/companies/status-badge";
import { Button } from "@/components/ui/button";
import { NlUpdateBox } from "@/components/ai/nl-update-box";
import { encodeToParam } from "@/lib/views/schema";
import type { FilterCondition } from "@/lib/views/types";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const ACTIVE_STATUSES = [
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
];

/** Build a /companies link pre-filtered with the given conditions. */
function companiesHref(conditions: FilterCondition[]): string {
  return `/companies?f=${encodeToParam({ op: "and", conditions })}`;
}

const CONFIRMED_HREF = companiesHref([
  { field: "status", op: "is", value: "confirmed" },
]);
const HOT_HREF = companiesHref([
  { field: "priority", op: "is", value: "high" },
  { field: "status", op: "is_one_of", value: ACTIVE_STATUSES },
]);
const STALLED_HREF = companiesHref([
  { field: "status", op: "is_one_of", value: ACTIVE_STATUSES },
  { field: "lastContactedAt", op: "older_than_n_days", value: 30 },
]);

export default async function DashboardPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [metrics, stalled, recent, myTasks, hotProspects] = await Promise.all([
    getDashboardMetrics(activeEvent.id),
    listStalledProspects(activeEvent.id),
    listRecentActivity(activeEvent.id),
    listMyOpenTasks(activeEvent.id, session.user.id),
    listHotProspects(activeEvent.id),
  ]);

  const goal = activeEvent.fundraisingGoal
    ? Number(activeEvent.fundraisingGoal)
    : null;
  const goalProgress =
    goal && goal > 0 ? Math.min(100, (metrics.confirmedAmount / goal) * 100) : 0;
  const pipelineAmount = metrics.proposedAmount + metrics.confirmedAmount;

  const firstName =
    session.user.name?.trim().split(/\s+/)[0] ??
    session.user.email?.split("@")[0] ??
    "there";

  const alertLinks: { href: string; label: string }[] = [];
  if (stalled.length > 0) {
    alertLinks.push({
      href: STALLED_HREF,
      label: `${stalled.length} stalled`,
    });
  }
  if (metrics.bouncedCount > 0) {
    alertLinks.push({
      href: companiesHref([
        { field: "tags", op: "contains", value: BOUNCED_TAG },
      ]),
      label: `${metrics.bouncedCount} bounced`,
    });
  }
  if (metrics.deferredCount > 0) {
    alertLinks.push({
      href: companiesHref([
        { field: "tags", op: "contains", value: DEFERRED_TAG },
      ]),
      label: `${metrics.deferredCount} deferred`,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* ── Do this next ─────────────────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Good {greetingHour()}, {firstName}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {activeEvent.name}
          {activeEvent.startDate ? ` · starts ${activeEvent.startDate}` : ""}
          {alertLinks.length > 0 ? (
            <>
              {" · "}
              {alertLinks.map((a, i) => (
                <span key={a.href}>
                  {i > 0 ? " · " : null}
                  <Link
                    href={a.href}
                    className="text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
                  >
                    {a.label}
                  </Link>
                </span>
              ))}
            </>
          ) : null}
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Today
          </h2>
          <Link
            href="/tasks"
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            All tasks
          </Link>
        </div>

        {myTasks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No open tasks assigned to you. You’re clear.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {myTasks.slice(0, 8).map((t) => {
              const inner = (
                <>
                  <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-100">
                    {t.title}
                    {t.companyName ? (
                      <span className="text-zinc-400"> · {t.companyName}</span>
                    ) : null}
                  </span>
                </>
              );
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0"
                >
                  {t.eventCompanyId ? (
                    <Link
                      href={`/companies?record=${t.eventCompanyId}`}
                      scroll={false}
                      className="flex min-w-0 flex-1 items-start gap-2 hover:underline"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      {inner}
                    </span>
                  )}
                  <span className="shrink-0 tabular-nums text-xs text-zinc-400">
                    {t.dueDate ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {myTasks.length > 8 ? (
          <Link
            href="/tasks"
            className="inline-block text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
          >
            +{myTasks.length - 8} more →
          </Link>
        ) : null}

        <NlUpdateBox />
      </section>

      {/* ── Money & pulse ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="grid gap-6 sm:grid-cols-3">
          <PulseStat
            label="Confirmed"
            value={formatCurrency(metrics.confirmedAmount)}
            hint={`${metrics.confirmedCount} sponsor${metrics.confirmedCount !== 1 ? "s" : ""}`}
            href={CONFIRMED_HREF}
          />
          <PulseStat
            label="Pipeline"
            value={formatCurrency(pipelineAmount)}
            hint="proposed + confirmed"
            href="/pipeline"
          />
          {goal ? (
            <PulseStat
              label="Goal"
              value={`${Math.round(goalProgress)}%`}
              hint={`${formatCurrency(metrics.confirmedAmount)} of ${formatCurrency(goal)}`}
              href="/reports"
            />
          ) : (
            <PulseStat
              label="Prospects"
              value={String(metrics.totalProspects)}
              hint="across the pipeline"
              href="/companies"
            />
          )}
        </div>
        {goal ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500 dark:bg-brand-400"
              style={{ width: `${goalProgress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(goalProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fundraising goal progress"
            />
          </div>
        ) : null}
      </section>

      {/* ── Watch ────────────────────────────────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-2">
        <WatchList
          title="Hot prospects"
          icon={<Flame className="h-3.5 w-3.5 text-orange-500" />}
          href={HOT_HREF}
          empty="No high-priority active prospects."
          items={hotProspects.map((p) => ({
            id: p.id,
            href: `/companies?record=${p.id}`,
            title: p.companyName,
            meta: formatRelativeDate(p.lastContactedAt),
            badge: <StatusBadge status={p.status} />,
            swatch: p.targetTierColor,
          }))}
        />
        <WatchList
          title="Stalled"
          href={STALLED_HREF}
          empty="Nothing stalled — keep it up."
          items={stalled.map((s) => ({
            id: s.id,
            href: `/companies?record=${s.id}`,
            title: s.companyName,
            meta: formatRelativeDate(s.lastContactedAt),
          }))}
        />
      </section>

      {/* ── Activity feed ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Recent activity
          </h2>
          <Link
            href="/reports"
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Reports
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No activity yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline gap-3 py-2.5 text-sm first:pt-0"
              >
                <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-zinc-400">
                  {a.type}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/companies?record=${a.eventCompanyId}`}
                    scroll={false}
                    className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                  >
                    {a.companyName}
                  </Link>
                  {a.subject ? (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      — {a.subject}
                    </span>
                  ) : null}
                  {a.userName ? (
                    <span className="text-zinc-400"> · {a.userName}</span>
                  ) : null}
                </div>
                <span className="shrink-0 tabular-nums text-xs text-zinc-400">
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

function greetingHour(): string {
  // Server-rendered; America/Chicago is the product default timezone.
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(new Date()),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function PulseStat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="font-display text-2xl font-semibold tracking-tight tabular-nums text-zinc-900 transition-colors group-hover:text-brand-700 dark:text-zinc-50 dark:group-hover:text-brand-300">
        {value}
      </p>
      {hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </Link>
  );
}

function WatchList({
  title,
  icon,
  href,
  empty,
  items,
}: {
  title: string;
  icon?: React.ReactNode;
  href: string;
  empty: string;
  items: {
    id: string;
    href: string;
    title: string;
    meta?: string | null;
    badge?: React.ReactNode;
    swatch?: string | null;
  }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {icon}
          {title}
        </h2>
        <Link
          href={href}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 py-2.5 text-sm first:pt-0"
            >
              {item.swatch ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.swatch }}
                  aria-hidden
                />
              ) : null}
              <Link
                href={item.href}
                scroll={false}
                className="min-w-0 flex-1 truncate font-medium text-zinc-800 hover:underline dark:text-zinc-100"
              >
                {item.title}
              </Link>
              {item.badge}
              {item.meta ? (
                <span className="shrink-0 tabular-nums text-xs text-zinc-400">
                  {item.meta}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
