"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  getAverageDaysInStage,
  getCadenceBreakdown,
  getConversionFunnel,
  getOwnerLeaderboard,
  getRevenueRollup,
  getTierMix,
} from "@/lib/db/queries/reports";

type ExportResult =
  | { ok: true; filename: string; csv: string }
  | { ok: false; error: string };

const schema = z.object({ eventId: z.uuid(), kind: z.string() });

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Array<readonly (string | number | null | undefined)[]>): string {
  return rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

export async function exportReportCsv(raw: unknown): Promise<ExportResult> {
  await requireSession();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { eventId, kind } = parsed.data;
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "funnel") {
    const f = await getConversionFunnel(eventId);
    const csv = toCsv([
      ["stage", "ever_reached", "pct_of_total", "pct_of_prev"],
      ...f.stages.map((s) => [
        s.status,
        s.count,
        s.pctOfTotal.toFixed(4),
        s.pctOfPrev === null ? "" : s.pctOfPrev.toFixed(4),
      ]),
      [],
      ["off_funnel", "count"],
      ...f.offFunnel.map((s) => [s.status, s.count]),
    ]);
    return { ok: true, filename: `funnel-${stamp}.csv`, csv };
  }

  if (kind === "leaderboard") {
    const rows = await getOwnerLeaderboard(eventId);
    const csv = toCsv([
      [
        "owner",
        "companies",
        "confirmed_count",
        "confirmed_amount",
        "proposed_amount",
        "interactions",
      ],
      ...rows.map((r) => [
        r.name,
        r.companies,
        r.confirmedCount,
        r.confirmedAmount.toFixed(2),
        r.proposedAmount.toFixed(2),
        r.interactions,
      ]),
    ]);
    return { ok: true, filename: `owner-leaderboard-${stamp}.csv`, csv };
  }

  if (kind === "tier-mix") {
    const rows = await getTierMix(eventId);
    const csv = toCsv([
      [
        "tier",
        "suggested_amount",
        "confirmed_count",
        "confirmed_amount",
        "target_count",
      ],
      ...rows.map((r) => [
        r.tierName,
        r.suggestedAmount?.toFixed(2) ?? "",
        r.confirmedCount,
        r.confirmedAmount.toFixed(2),
        r.targetCount,
      ]),
    ]);
    return { ok: true, filename: `tier-mix-${stamp}.csv`, csv };
  }

  if (kind === "days-in-stage") {
    const rows = await getAverageDaysInStage(eventId);
    const csv = toCsv([
      ["stage", "count", "avg_days"],
      ...rows.map((r) => [
        r.status,
        r.count,
        r.avgDays === null ? "" : r.avgDays,
      ]),
    ]);
    return { ok: true, filename: `days-in-stage-${stamp}.csv`, csv };
  }

  if (kind === "summary") {
    const [funnel, rollup, leaderboard, mix, cadence, days] = await Promise.all([
      getConversionFunnel(eventId),
      getRevenueRollup(eventId),
      getOwnerLeaderboard(eventId),
      getTierMix(eventId),
      getCadenceBreakdown(eventId),
      getAverageDaysInStage(eventId),
    ]);
    const csv = toCsv([
      ["section", "key", "value"],
      ["revenue", "currency", rollup.currency],
      ["revenue", "goal", rollup.fundraisingGoal ?? ""],
      ["revenue", "confirmed_count", rollup.confirmedCount],
      ["revenue", "confirmed_amount", rollup.confirmedAmount.toFixed(2)],
      ["revenue", "proposed_amount", rollup.proposedAmount.toFixed(2)],
      ["revenue", "expected_amount", rollup.expectedAmount.toFixed(2)],
      ["revenue", "gap_to_goal", rollup.gapToGoal?.toFixed(2) ?? ""],
      ["revenue", "pct_of_goal", rollup.pctOfGoal?.toFixed(4) ?? ""],
      [],
      ["cadence", "ok", cadence.ok],
      ["cadence", "amber_14d", cadence.amber],
      ["cadence", "red_30d", cadence.red],
      [],
      ["funnel_stage", "ever_reached", "pct_of_total"],
      ...funnel.stages.map((s) => [
        s.status,
        s.count,
        s.pctOfTotal.toFixed(4),
      ]),
      [],
      ["owner", "companies", "confirmed_amount"],
      ...leaderboard.map((r) => [
        r.name,
        r.companies,
        r.confirmedAmount.toFixed(2),
      ]),
      [],
      ["tier", "confirmed_count", "confirmed_amount"],
      ...mix.map((r) => [r.tierName, r.confirmedCount, r.confirmedAmount.toFixed(2)]),
      [],
      ["stage", "in_stage_count", "avg_days_in_stage"],
      ...days.map((r) => [
        r.status,
        r.count,
        r.avgDays === null ? "" : r.avgDays,
      ]),
    ]);
    return { ok: true, filename: `report-summary-${stamp}.csv`, csv };
  }

  return { ok: false, error: `Unknown report kind: ${kind}` };
}
