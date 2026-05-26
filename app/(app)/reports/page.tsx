import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActiveEvents } from "@/lib/db/queries/events";
import {
  getAverageDaysInStage,
  getCadenceBreakdown,
  getConversionFunnel,
  getOwnerLeaderboard,
  getRevenueRollup,
  getTierMix,
} from "@/lib/db/queries/reports";
import { Button } from "@/components/ui/button";
import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { PROSPECT_STATUS_LABELS } from "@/components/companies/status-badge";
import { formatCurrency } from "@/lib/format";

const pctFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default async function ReportsPage() {
  const session = await requireSession();
  const events = await listActiveEvents();
  const activeEvent =
    events.find((e) => e.id === session.user.activeEventId) ?? events[0] ?? null;

  if (!activeEvent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No event yet. Create one to start tracking sponsors.
        </p>
        <Link href="/admin/events">
          <Button>Open admin → Events</Button>
        </Link>
      </div>
    );
  }

  const [funnel, rollup, leaderboard, mix, cadence, days] = await Promise.all([
    getConversionFunnel(activeEvent.id),
    getRevenueRollup(activeEvent.id),
    getOwnerLeaderboard(activeEvent.id),
    getTierMix(activeEvent.id),
    getCadenceBreakdown(activeEvent.id),
    getAverageDaysInStage(activeEvent.id),
  ]);

  const cadenceTotal = cadence.ok + cadence.amber + cadence.red;
  const maxLeaderboard = Math.max(
    1,
    ...leaderboard.map((r) => r.confirmedAmount),
  );
  const maxFunnel = Math.max(1, ...funnel.stages.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {activeEvent.name} · live snapshot
          </p>
        </div>
        <CsvDownloadButton
          eventId={activeEvent.id}
          kind="summary"
          label="Export full summary"
          variant="default"
        />
      </div>

      {/* Revenue rollup */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Goal"
          value={
            rollup.fundraisingGoal
              ? formatCurrency(rollup.fundraisingGoal, rollup.currency)
              : "—"
          }
        />
        <Kpi
          label="Confirmed"
          value={formatCurrency(rollup.confirmedAmount, rollup.currency)}
          sublabel={`${rollup.confirmedCount} sponsors`}
          tone="emerald"
        />
        <Kpi
          label="Expected (in proposal pipeline)"
          value={formatCurrency(rollup.expectedAmount, rollup.currency)}
        />
        <Kpi
          label={rollup.gapToGoal !== null && rollup.gapToGoal < 0 ? "Over goal" : "Gap to goal"}
          value={
            rollup.gapToGoal === null
              ? "—"
              : formatCurrency(Math.abs(rollup.gapToGoal), rollup.currency)
          }
          sublabel={
            rollup.pctOfGoal !== null
              ? `${pctFmt.format(rollup.pctOfGoal)} of goal`
              : undefined
          }
          tone={
            rollup.pctOfGoal === null
              ? "slate"
              : rollup.pctOfGoal >= 1
                ? "emerald"
                : rollup.pctOfGoal >= 0.5
                  ? "amber"
                  : "red"
          }
        />
      </section>

      {/* Conversion funnel */}
      <Section
        title="Conversion funnel"
        subtitle="Cumulative — count of prospects that have ever reached each stage."
        actions={<CsvDownloadButton eventId={activeEvent.id} kind="funnel" />}
      >
        {funnel.total === 0 ? (
          <Empty>No prospects yet.</Empty>
        ) : (
          <div className="space-y-1.5">
            {funnel.stages.map((s) => (
              <FunnelBar
                key={s.status}
                label={PROSPECT_STATUS_LABELS[s.status] ?? s.status}
                count={s.count}
                pctOfPrev={s.pctOfPrev}
                fillPct={(s.count / maxFunnel) * 100}
              />
            ))}
            {funnel.offFunnel.some((s) => s.count > 0) ? (
              <div className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Off-funnel:{" "}
                {funnel.offFunnel
                  .filter((s) => s.count > 0)
                  .map(
                    (s) =>
                      `${PROSPECT_STATUS_LABELS[s.status] ?? s.status}: ${s.count}`,
                  )
                  .join(" · ")}
              </div>
            ) : null}
          </div>
        )}
      </Section>

      {/* Owner leaderboard */}
      <Section
        title="Owner leaderboard"
        subtitle="Per-owner companies, confirmed dollars, proposed dollars, interactions."
        actions={<CsvDownloadButton eventId={activeEvent.id} kind="leaderboard" />}
      >
        {leaderboard.length === 0 ? (
          <Empty>No owners assigned yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-1 pr-2">Owner</th>
                  <th className="py-1 pr-2 text-right">Companies</th>
                  <th className="py-1 pr-2 text-right">Confirmed</th>
                  <th className="py-1 pr-2 text-right">Proposed</th>
                  <th className="py-1 pr-2 text-right">Interactions</th>
                  <th className="py-1 w-32 pl-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {leaderboard.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-1.5 pr-2 font-medium">{r.name}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.companies}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formatCurrency(r.confirmedAmount, rollup.currency)}
                      <span className="ml-1 text-xs text-slate-400">
                        ({r.confirmedCount})
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(r.proposedAmount, rollup.currency)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.interactions}
                    </td>
                    <td className="py-1.5 pl-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-emerald-500 dark:bg-emerald-400"
                          style={{
                            width: `${(r.confirmedAmount / maxLeaderboard) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Tier mix */}
      <Section
        title="Tier mix"
        subtitle="Confirmed sponsors by tier vs. how many prospects target each tier."
        actions={<CsvDownloadButton eventId={activeEvent.id} kind="tier-mix" />}
      >
        {mix.length === 0 ? (
          <Empty>No tiers defined for this event.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-1 pr-2">Tier</th>
                  <th className="py-1 pr-2 text-right">Suggested</th>
                  <th className="py-1 pr-2 text-right">Confirmed</th>
                  <th className="py-1 pr-2 text-right">Target count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {mix.map((r) => (
                  <tr key={r.tierId ?? r.tierName}>
                    <td className="py-1.5 pr-2 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: r.tierColor ?? "#94a3b8" }}
                        />
                        {r.tierName}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.suggestedAmount !== null
                        ? formatCurrency(r.suggestedAmount, rollup.currency)
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {formatCurrency(r.confirmedAmount, rollup.currency)}
                      <span className="ml-1 text-xs text-slate-400">
                        ({r.confirmedCount})
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {r.targetCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cadence */}
        <Section
          title="Cadence"
          subtitle="Active prospects, by days since last contact."
        >
          {cadenceTotal === 0 ? (
            <Empty>No active prospects.</Empty>
          ) : (
            <CadenceBar
              ok={cadence.ok}
              amber={cadence.amber}
              red={cadence.red}
            />
          )}
        </Section>

        {/* Avg days in stage */}
        <Section
          title="Average days in stage"
          subtitle="How long the current occupants have sat at each stage."
          actions={
            <CsvDownloadButton eventId={activeEvent.id} kind="days-in-stage" />
          }
        >
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1 pr-2">Stage</th>
                <th className="py-1 pr-2 text-right">Count</th>
                <th className="py-1 pr-2 text-right">Avg days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {days.map((r) => (
                <tr key={r.status}>
                  <td className="py-1.5 pr-2">
                    {PROSPECT_STATUS_LABELS[r.status] ?? r.status}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {r.count}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {r.avgDays === null ? "—" : `${r.avgDays}d`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Snapshot generated {new Date().toLocaleString()}. Reload for fresh data.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function Section({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  sublabel,
  tone = "slate",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "slate" | "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-300"
        : tone === "red"
          ? "text-red-700 dark:text-red-300"
          : "";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sublabel ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>
      ) : null}
    </div>
  );
}

function FunnelBar({
  label,
  count,
  pctOfPrev,
  fillPct,
}: {
  label: string;
  count: number;
  pctOfPrev: number | null;
  fillPct: number;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr_5rem] items-center gap-3">
      <div className="truncate text-sm">{label}</div>
      <div className="h-5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-slate-700 dark:bg-slate-300"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="text-right text-sm tabular-nums">
        {count}
        {pctOfPrev !== null ? (
          <span className="ml-1 text-xs text-slate-400">
            ({pctFmt.format(pctOfPrev)})
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CadenceBar({
  ok,
  amber,
  red,
}: {
  ok: number;
  amber: number;
  red: number;
}) {
  const total = ok + amber + red;
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div
          className="bg-emerald-500"
          style={{ width: `${(ok / total) * 100}%` }}
          title={`OK: ${ok}`}
        />
        <div
          className="bg-amber-500"
          style={{ width: `${(amber / total) * 100}%` }}
          title={`Amber (14+d): ${amber}`}
        />
        <div
          className="bg-red-500"
          style={{ width: `${(red / total) * 100}%` }}
          title={`Red (30+d): ${red}`}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <Legend color="bg-emerald-500" label={`OK (under 14d): ${ok}`} />
        <Legend color="bg-amber-500" label={`Stale 14+d: ${amber}`} />
        <Legend color="bg-red-500" label={`Stalled 30+d: ${red}`} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
