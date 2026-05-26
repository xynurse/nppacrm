import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLog,
  eventCompanies,
  events,
  interactions,
  sponsorshipTiers,
  users,
  PROSPECT_STATUS_VALUES,
  type ProspectStatus,
} from "@/lib/db/schema";

/**
 * The 9 prospect statuses make a roughly-ordered funnel. We treat
 * "declined" + "past_sponsor" as terminal off-funnel buckets; the other 7
 * progress monotonically left → right.
 */
export const FUNNEL_ORDER: ProspectStatus[] = [
  "prospect",
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
  "committed",
  "confirmed",
];
export const OFF_FUNNEL: ProspectStatus[] = ["declined", "past_sponsor"];

export type FunnelStage = {
  status: ProspectStatus;
  count: number;
  pctOfTotal: number;
  pctOfPrev: number | null; // null for the first stage
};

export type FunnelReport = {
  total: number;
  stages: FunnelStage[];
  offFunnel: { status: ProspectStatus; count: number }[];
};

/**
 * Cumulative funnel — count of prospects that have EVER reached each stage,
 * not just are currently at it. We derive "ever reached X" from current
 * status + audit log of move_status actions.
 *
 * Simpler initial implementation: assume forward progress only. A prospect
 * currently at "negotiating" is counted as having reached
 * prospect/contacted/engaged/proposal_sent/negotiating. That's right ~95%
 * of the time and exactly matches what conversion rate dashboards expect.
 */
export async function getConversionFunnel(
  eventId: string,
): Promise<FunnelReport> {
  const rows = await db
    .select({ status: eventCompanies.status })
    .from(eventCompanies)
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    );

  const byStatus = new Map<ProspectStatus, number>();
  for (const s of PROSPECT_STATUS_VALUES) byStatus.set(s, 0);
  for (const r of rows) {
    byStatus.set(
      r.status as ProspectStatus,
      (byStatus.get(r.status as ProspectStatus) ?? 0) + 1,
    );
  }

  // Cumulative "ever reached" by walking the funnel from right to left and
  // adding upstream counts. Excludes off-funnel buckets.
  const cumulative = new Map<ProspectStatus, number>();
  let running = 0;
  for (let i = FUNNEL_ORDER.length - 1; i >= 0; i--) {
    const s = FUNNEL_ORDER[i];
    if (!s) continue;
    running += byStatus.get(s) ?? 0;
    cumulative.set(s, running);
  }
  // Also fold off-funnel rows in to the totals — declined prospects DID
  // reach some upstream stage. We don't know which, so we'll just include
  // them in the total but not propagate.
  const offFunnel = OFF_FUNNEL.map((s) => ({
    status: s,
    count: byStatus.get(s) ?? 0,
  }));
  const total = rows.length;

  const stages: FunnelStage[] = FUNNEL_ORDER.map((s, i) => {
    const count = cumulative.get(s) ?? 0;
    const prevCount = i === 0 ? null : (cumulative.get(FUNNEL_ORDER[i - 1]!) ?? 0);
    return {
      status: s,
      count,
      pctOfTotal: total > 0 ? count / total : 0,
      pctOfPrev:
        prevCount === null
          ? null
          : prevCount > 0
            ? count / prevCount
            : 0,
    };
  });

  return { total, stages, offFunnel };
}

export type OwnerLeaderboardRow = {
  userId: string;
  name: string;
  companies: number;
  confirmedCount: number;
  confirmedAmount: number;
  proposedAmount: number;
  interactions: number;
};

export async function getOwnerLeaderboard(
  eventId: string,
): Promise<OwnerLeaderboardRow[]> {
  // Owners + their company counts + amount sums.
  const ownerRows = await db
    .select({
      userId: users.id,
      name: users.name,
      companies: sql<number>`count(${eventCompanies.id})::int`,
      confirmedCount:
        sql<number>`sum(case when ${eventCompanies.status} = 'confirmed' then 1 else 0 end)::int`,
      confirmedAmount:
        sql<string>`coalesce(sum(case when ${eventCompanies.status} = 'confirmed' then ${eventCompanies.confirmedAmount} else 0 end), 0)`,
      proposedAmount:
        sql<string>`coalesce(sum(${eventCompanies.proposedAmount}), 0)`,
    })
    .from(eventCompanies)
    .innerJoin(users, eq(users.id, eventCompanies.ownerId))
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    )
    .groupBy(users.id, users.name);

  // Interaction counts per user for this event.
  const interactionRows = await db
    .select({
      userId: interactions.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(interactions)
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.id, interactions.eventCompanyId),
    )
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    )
    .groupBy(interactions.userId);

  const interactionCount = new Map<string, number>();
  for (const r of interactionRows) {
    if (r.userId) interactionCount.set(r.userId, r.count);
  }

  return ownerRows
    .map((r) => ({
      userId: r.userId,
      name: r.name,
      companies: r.companies,
      confirmedCount: r.confirmedCount,
      confirmedAmount: Number(r.confirmedAmount),
      proposedAmount: Number(r.proposedAmount),
      interactions: interactionCount.get(r.userId) ?? 0,
    }))
    .sort((a, b) => b.confirmedAmount - a.confirmedAmount);
}

export type TierMixRow = {
  tierId: string | null;
  tierName: string;
  tierColor: string | null;
  suggestedAmount: number | null;
  confirmedCount: number;
  confirmedAmount: number;
  targetCount: number; // count of rows with targetTierId set to this tier
};

export async function getTierMix(eventId: string): Promise<TierMixRow[]> {
  // All tiers for the event so untouched tiers still show with zeros.
  const tiers = await db
    .select()
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.eventId, eventId))
    .orderBy(asc(sponsorshipTiers.displayOrder));

  // Confirmed-by-tier aggregation.
  const confirmedAgg = await db
    .select({
      tierId: eventCompanies.confirmedTierId,
      confirmedCount: sql<number>`count(*)::int`,
      confirmedAmount: sql<string>`coalesce(sum(${eventCompanies.confirmedAmount}), 0)`,
    })
    .from(eventCompanies)
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        eq(eventCompanies.status, "confirmed"),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .groupBy(eventCompanies.confirmedTierId);

  // Target-tier aggregation (across any active status).
  const targetAgg = await db
    .select({
      tierId: eventCompanies.targetTierId,
      targetCount: sql<number>`count(*)::int`,
    })
    .from(eventCompanies)
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    )
    .groupBy(eventCompanies.targetTierId);

  const confirmedMap = new Map(
    confirmedAgg.map((r) => [
      r.tierId,
      { count: r.confirmedCount, amount: Number(r.confirmedAmount) },
    ]),
  );
  const targetMap = new Map(targetAgg.map((r) => [r.tierId, r.targetCount]));

  return tiers.map((t) => {
    const c = confirmedMap.get(t.id);
    return {
      tierId: t.id,
      tierName: t.name,
      tierColor: t.color,
      suggestedAmount: t.suggestedAmount ? Number(t.suggestedAmount) : null,
      confirmedCount: c?.count ?? 0,
      confirmedAmount: c?.amount ?? 0,
      targetCount: targetMap.get(t.id) ?? 0,
    };
  });
}

export type RevenueRollup = {
  fundraisingGoal: number | null;
  currency: string;
  confirmedCount: number;
  confirmedAmount: number;
  proposedAmount: number;
  expectedAmount: number; // proposed-but-not-yet-confirmed
  gapToGoal: number | null;
  pctOfGoal: number | null;
};

export async function getRevenueRollup(
  eventId: string,
): Promise<RevenueRollup> {
  const [evt] = await db
    .select({
      fundraisingGoal: events.fundraisingGoal,
      currency: events.currency,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  const rows = await db
    .select({
      status: eventCompanies.status,
      proposed: eventCompanies.proposedAmount,
      confirmed: eventCompanies.confirmedAmount,
    })
    .from(eventCompanies)
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    );

  let confirmedCount = 0;
  let confirmedAmount = 0;
  let proposedAmount = 0;
  let expectedAmount = 0;
  for (const r of rows) {
    if (r.status === "confirmed") {
      confirmedCount += 1;
      if (r.confirmed) confirmedAmount += Number(r.confirmed);
    } else if (
      r.status === "proposal_sent" ||
      r.status === "negotiating" ||
      r.status === "committed"
    ) {
      if (r.proposed) expectedAmount += Number(r.proposed);
    }
    if (r.proposed) proposedAmount += Number(r.proposed);
  }

  const goal = evt?.fundraisingGoal ? Number(evt.fundraisingGoal) : null;

  return {
    fundraisingGoal: goal,
    currency: evt?.currency ?? "USD",
    confirmedCount,
    confirmedAmount,
    proposedAmount,
    expectedAmount,
    gapToGoal: goal === null ? null : goal - confirmedAmount,
    pctOfGoal: goal === null || goal === 0 ? null : confirmedAmount / goal,
  };
}

export type CadenceBreakdown = {
  ok: number;
  amber: number;
  red: number;
};

const CADENCE_ACTIVE: ProspectStatus[] = [
  "prospect",
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
  "committed",
];

export async function getCadenceBreakdown(
  eventId: string,
): Promise<CadenceBreakdown> {
  const rows = await db
    .select({
      status: eventCompanies.status,
      lastContactedAt: eventCompanies.lastContactedAt,
    })
    .from(eventCompanies)
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    );

  const now = Date.now();
  const out: CadenceBreakdown = { ok: 0, amber: 0, red: 0 };
  for (const r of rows) {
    if (!CADENCE_ACTIVE.includes(r.status as ProspectStatus)) continue;
    if (!r.lastContactedAt) {
      out.red += 1;
      continue;
    }
    const days = Math.floor(
      (now - r.lastContactedAt.getTime()) / 86_400_000,
    );
    if (days >= 30) out.red += 1;
    else if (days >= 14) out.amber += 1;
    else out.ok += 1;
  }
  return out;
}

/**
 * Average days a prospect has been in its CURRENT status, broken out by
 * status. Computed from audit_log entries with action='eventCompany.move_status'.
 *
 * For prospects with NO move history (still in their seeded status), we
 * fall back to days since `eventCompany.createdAt`.
 *
 * Returns Infinity-safe rounded ints. Empty stages → null average.
 */
export type DaysInStageRow = {
  status: ProspectStatus;
  count: number;
  avgDays: number | null;
};

export async function getAverageDaysInStage(
  eventId: string,
): Promise<DaysInStageRow[]> {
  const ecs = await db
    .select({
      id: eventCompanies.id,
      status: eventCompanies.status,
      createdAt: eventCompanies.createdAt,
    })
    .from(eventCompanies)
    .where(
      and(eq(eventCompanies.eventId, eventId), isNull(eventCompanies.deletedAt)),
    );

  if (ecs.length === 0) {
    return PROSPECT_STATUS_VALUES.map((s) => ({
      status: s as ProspectStatus,
      count: 0,
      avgDays: null,
    }));
  }

  // Latest audit entry per (entityId, status reached) by reading move_status rows.
  const audits = await db
    .select({
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityType, "eventCompany"),
        eq(auditLog.action, "eventCompany.move_status"),
        gte(auditLog.createdAt, new Date(0)),
      ),
    )
    .orderBy(desc(auditLog.createdAt));

  // For each ec.id, find the most recent audit entry where changes.to === ec.status.
  const enteredAt = new Map<string, Date>();
  const seenStatusEntry = new Set<string>();
  for (const a of audits) {
    const to = (a.changes as { to?: string })?.to;
    if (!to) continue;
    const key = `${a.entityId}::${to}`;
    if (seenStatusEntry.has(key)) continue;
    seenStatusEntry.add(key);
    enteredAt.set(a.entityId, a.createdAt);
  }

  const now = Date.now();
  const sums: Record<string, { count: number; totalDays: number }> = {};
  for (const s of PROSPECT_STATUS_VALUES) {
    sums[s] = { count: 0, totalDays: 0 };
  }

  for (const ec of ecs) {
    const since =
      enteredAt.get(ec.id) ?? ec.createdAt;
    const days = Math.floor((now - since.getTime()) / 86_400_000);
    const bucket = sums[ec.status];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.totalDays += Math.max(0, days);
  }

  return PROSPECT_STATUS_VALUES.map((s) => {
    const b = sums[s];
    const count = b?.count ?? 0;
    const total = b?.totalDays ?? 0;
    return {
      status: s as ProspectStatus,
      count,
      avgDays: count > 0 ? Math.round(total / count) : null,
    };
  });
}
