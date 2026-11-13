import type { ReactNode } from "react";
import Link from "next/link";
import {
  Flag,
  MapPin,
  Target,
  UserRound,
  Users as UsersIcon,
} from "lucide-react";
import type { Event, EventCourseDirector } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

export function EventAboutSection({
  event,
  isAdmin,
}: {
  event: Event;
  isAdmin: boolean;
}) {
  const hasAbout = Boolean(event.location || event.description);
  return (
    <section className="surface-card p-4 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold">About this event</h2>
        {isAdmin ? (
          <Link
            href={`/admin/events/${event.id}`}
            className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Edit details →
          </Link>
        ) : null}
      </div>
      {hasAbout ? (
        <div className="space-y-2 text-sm">
          {event.location ? (
            <p className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{event.location}</span>
            </p>
          ) : null}
          {event.description ? (
            <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
              {event.description}
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyHint
          isAdmin={isAdmin}
          eventId={event.id}
          message="No location or description yet."
        />
      )}
    </section>
  );
}

export function EventCourseDirectorsSection({
  directors,
  eventId,
  isAdmin,
}: {
  directors: EventCourseDirector[];
  eventId: string;
  isAdmin: boolean;
}) {
  return (
    <section className="surface-card p-4 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold">Course directors</h2>
        {isAdmin ? (
          <Link
            href={`/admin/events/${eventId}`}
            className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Manage →
          </Link>
        ) : null}
      </div>
      {directors.length === 0 ? (
        <EmptyHint
          isAdmin={isAdmin}
          eventId={eventId}
          message="No course directors listed."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {directors.map((d, i) => (
            <li
              key={`${d.name}-${i}`}
              className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {initials(d.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {d.name}
                    {d.credentials ? (
                      <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                        {d.credentials}
                      </span>
                    ) : null}
                  </p>
                  {d.title ? (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {d.title}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EventGoalsSection({
  goals,
  eventId,
  isAdmin,
}: {
  goals: string[];
  eventId: string;
  isAdmin: boolean;
}) {
  return (
    <section className="surface-card p-4 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <Flag className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold">Goals</h2>
        {isAdmin ? (
          <Link
            href={`/admin/events/${eventId}`}
            className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Edit →
          </Link>
        ) : null}
      </div>
      {goals.length === 0 ? (
        <EmptyHint
          isAdmin={isAdmin}
          eventId={eventId}
          message="No goals captured for this year."
        />
      ) : (
        <ul className="space-y-2">
          {goals.map((goal, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-zinc-800 dark:text-slate-300">
                {i + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-200">{goal}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EventMetricsTargetsSection({
  event,
  confirmedCount,
  confirmedAmount,
  isAdmin,
}: {
  event: Event;
  confirmedCount: number;
  confirmedAmount: number;
  isAdmin: boolean;
}) {
  const currency = event.currency;
  const hasAnyTarget =
    event.fundraisingGoal != null ||
    event.attendeeGoal != null ||
    event.sponsorCountGoal != null;

  const fundGoal = event.fundraisingGoal
    ? Number(event.fundraisingGoal)
    : null;
  const fundPct =
    fundGoal && fundGoal > 0
      ? Math.min(100, (confirmedAmount / fundGoal) * 100)
      : null;
  const sponsorPct =
    event.sponsorCountGoal && event.sponsorCountGoal > 0
      ? Math.min(100, (confirmedCount / event.sponsorCountGoal) * 100)
      : null;

  return (
    <section className="surface-card p-4 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold">Targets &amp; metrics</h2>
        {isAdmin ? (
          <Link
            href={`/admin/events/${event.id}`}
            className="ml-auto text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Set targets →
          </Link>
        ) : null}
      </div>
      {!hasAnyTarget ? (
        <EmptyHint
          isAdmin={isAdmin}
          eventId={event.id}
          message="No fundraising, attendee, or sponsor targets set."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Fundraising"
            value={
              fundGoal != null
                ? formatCurrency(confirmedAmount, currency)
                : "—"
            }
            sub={
              fundGoal != null
                ? `of ${formatCurrency(fundGoal, currency)}`
                : "No goal"
            }
            pct={fundPct}
            accent="green"
          />
          <MetricCard
            label="Confirmed sponsors"
            value={String(confirmedCount)}
            sub={
              event.sponsorCountGoal != null
                ? `of ${event.sponsorCountGoal} target`
                : "No count goal"
            }
            pct={sponsorPct}
            accent="blue"
            icon={<UsersIcon className="h-3.5 w-3.5" />}
          />
          <MetricCard
            label="Attendee goal"
            value={
              event.attendeeGoal != null ? String(event.attendeeGoal) : "—"
            }
            sub={
              event.attendeeGoal != null
                ? "expected attendance"
                : "Not set"
            }
          />
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
  pct,
  accent = "default",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  pct?: number | null;
  accent?: "default" | "green" | "blue";
  icon?: ReactNode;
}) {
  const accentCls = {
    default: "text-slate-700 dark:text-slate-200",
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
  }[accent];
  const barCls = {
    default: "bg-slate-400",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
  }[accent];

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", accentCls)}>
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      ) : null}
      {pct != null ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
          <div
            className={cn("h-full rounded-full transition-all", barCls)}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function EmptyHint({
  message,
  isAdmin,
  eventId,
}: {
  message: string;
  isAdmin: boolean;
  eventId: string;
}) {
  return (
    <p className="text-sm text-slate-500">
      {message}{" "}
      {isAdmin ? (
        <Link
          href={`/admin/events/${eventId}`}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          Add now →
        </Link>
      ) : null}
    </p>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
