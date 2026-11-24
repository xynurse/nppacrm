import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { isUndefinedColumnError } from "@/lib/db/errors";
import {
  companies,
  eventCompanies,
  interactions,
  sponsorshipTiers,
  tasks,
  users,
} from "@/lib/db/schema";
import { aliasedTable } from "drizzle-orm";

export type StalledRow = {
  id: string;
  companyName: string;
  status: typeof eventCompanies.$inferSelect.status;
  lastContactedAt: Date | null;
  ownerName: string | null;
};

export type ActivityRow = {
  id: string;
  type: typeof interactions.$inferSelect.type;
  subject: string | null;
  occurredAt: Date;
  companyName: string;
  eventCompanyId: string;
  userName: string | null;
  category: string | null;
  subcategory: string | null;
};

export type ActivityFilters = {
  category?: string | null;
  subcategory?: string | null;
  /** Inclusive start date `YYYY-MM-DD` (America/Chicago calendar day). */
  from?: string | null;
  /** Inclusive end date `YYYY-MM-DD`. */
  to?: string | null;
};

export type ActivityCategoryOption = {
  category: string;
  subcategory: string | null;
};

export type DashboardMetrics = {
  totalProspects: number;
  confirmedCount: number;
  confirmedAmount: number;
  proposedAmount: number;
  byStatus: Record<string, number>;
  /** Companies flagged with the BOUNCED tag (undeliverable email). Overlaps
   * the status buckets — it's a data-quality overlay, not a funnel stage. */
  bouncedCount: number;
  /** Companies flagged with the DEFERRED tag (held from a batch, still a
   * future prospect). Also an overlay, not a funnel stage. */
  deferredCount: number;
  fundraisingGoal: string | null;
};

const STALE_DAYS = 30;
const ACTIVE_STATUSES = [
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
] as const;

export async function getDashboardMetrics(
  eventId: string,
): Promise<DashboardMetrics> {
  const rows = await db
    .select({
      status: eventCompanies.status,
      proposedAmount: eventCompanies.proposedAmount,
      confirmedAmount: eventCompanies.confirmedAmount,
      tagsCache: eventCompanies.tagsCache,
    })
    .from(eventCompanies)
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
      ),
    );

  let totalProspects = 0;
  let confirmedCount = 0;
  let confirmedAmount = 0;
  let proposedAmount = 0;
  let bouncedCount = 0;
  let deferredCount = 0;
  const byStatus: Record<string, number> = {};

  for (const r of rows) {
    totalProspects += 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "confirmed") {
      confirmedCount += 1;
      if (r.confirmedAmount) confirmedAmount += Number(r.confirmedAmount);
    }
    if (r.proposedAmount) proposedAmount += Number(r.proposedAmount);
    if (r.tagsCache?.includes("BOUNCED")) bouncedCount += 1;
    if (r.tagsCache?.includes("DEFERRED")) deferredCount += 1;
  }

  return {
    totalProspects,
    confirmedCount,
    confirmedAmount,
    proposedAmount,
    byStatus,
    bouncedCount,
    deferredCount,
    fundraisingGoal: null,
  };
}

export async function listStalledProspects(
  eventId: string,
  limit = 8,
): Promise<StalledRow[]> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000);
  return db
    .select({
      id: eventCompanies.id,
      companyName: companies.name,
      status: eventCompanies.status,
      lastContactedAt: eventCompanies.lastContactedAt,
      ownerName: users.name,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, eventCompanies.ownerId))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        inArray(eventCompanies.status, [...ACTIVE_STATUSES]),
        isNotNull(eventCompanies.lastContactedAt),
        lt(eventCompanies.lastContactedAt, cutoff),
      ),
    )
    .orderBy(asc(eventCompanies.lastContactedAt))
    .limit(limit);
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/u;

export async function listRecentActivity(
  eventId: string,
  limit = 40,
  filters: ActivityFilters = {},
): Promise<ActivityRow[]> {
  const category = filters.category?.trim() || null;
  const subcategory = filters.subcategory?.trim() || null;
  const from = filters.from?.trim() || null;
  const to = filters.to?.trim() || null;

  const conditions = [
    eq(interactions.eventId, eventId),
    isNull(eventCompanies.deletedAt),
  ];

  if (category) {
    conditions.push(eq(companies.category, category));
  }
  if (subcategory) {
    conditions.push(eq(companies.subcategory, subcategory));
  }
  // Calendar-day bounds in America/Chicago (product default timezone).
  if (from && YMD_RE.test(from)) {
    conditions.push(
      sql`(${interactions.occurredAt} AT TIME ZONE 'America/Chicago')::date >= ${from}::date`,
    );
  }
  if (to && YMD_RE.test(to)) {
    conditions.push(
      sql`(${interactions.occurredAt} AT TIME ZONE 'America/Chicago')::date <= ${to}::date`,
    );
  }

  return db
    .select({
      id: interactions.id,
      type: interactions.type,
      subject: interactions.subject,
      occurredAt: interactions.occurredAt,
      companyName: companies.name,
      eventCompanyId: interactions.eventCompanyId,
      userName: users.name,
      category: companies.category,
      subcategory: companies.subcategory,
    })
    .from(interactions)
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.id, interactions.eventCompanyId),
    )
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, interactions.userId))
    .where(and(...conditions))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}

/** Distinct company category/subcategory pairs for the event's activity feed. */
export async function listActivityCategoryOptions(
  eventId: string,
): Promise<ActivityCategoryOption[]> {
  const rows = await db
    .selectDistinct({
      category: companies.category,
      subcategory: companies.subcategory,
    })
    .from(interactions)
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.id, interactions.eventCompanyId),
    )
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .where(
      and(
        eq(interactions.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNotNull(companies.category),
        sql`trim(${companies.category}) <> ''`,
      ),
    )
    .orderBy(asc(companies.category), asc(companies.subcategory));

  return rows
    .filter((r): r is { category: string; subcategory: string | null } =>
      Boolean(r.category),
    )
    .map((r) => ({
      category: r.category,
      subcategory: r.subcategory?.trim() ? r.subcategory : null,
    }));
}

export type MyTaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  companyName: string | null;
  eventCompanyId: string | null;
};

export type HotProspectRow = {
  id: string;
  companyName: string;
  status: typeof eventCompanies.$inferSelect.status;
  ownerName: string | null;
  targetTierName: string | null;
  targetTierColor: string | null;
  lastContactedAt: Date | null;
};

export async function listHotProspects(
  eventId: string,
  limit = 6,
): Promise<HotProspectRow[]> {
  const targetTiers = aliasedTable(sponsorshipTiers, "target_tiers_hot");
  return db
    .select({
      id: eventCompanies.id,
      companyName: companies.name,
      status: eventCompanies.status,
      ownerName: users.name,
      targetTierName: targetTiers.name,
      targetTierColor: targetTiers.color,
      lastContactedAt: eventCompanies.lastContactedAt,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, eventCompanies.ownerId))
    .leftJoin(targetTiers, eq(targetTiers.id, eventCompanies.targetTierId))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        eq(eventCompanies.priority, "high"),
        inArray(eventCompanies.status, [
          "contacted",
          "engaged",
          "proposal_sent",
          "negotiating",
        ]),
      ),
    )
    .orderBy(desc(eventCompanies.lastContactedAt))
    .limit(limit);
}

export type TierMixRow = {
  tierName: string;
  tierColor: string | null;
  confirmedCount: number;
  confirmedAmount: number;
};

export async function listTierMix(
  eventId: string,
): Promise<TierMixRow[]> {
  const rows = await db
    .select({
      tierName: sponsorshipTiers.name,
      tierColor: sponsorshipTiers.color,
      confirmedAmount: eventCompanies.confirmedAmount,
    })
    .from(eventCompanies)
    .innerJoin(
      sponsorshipTiers,
      eq(sponsorshipTiers.id, eventCompanies.confirmedTierId),
    )
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        eq(eventCompanies.status, "confirmed"),
        isNull(eventCompanies.deletedAt),
      ),
    );

  const byTier = new Map<string, TierMixRow>();
  for (const r of rows) {
    const existing = byTier.get(r.tierName);
    if (existing) {
      existing.confirmedCount += 1;
      existing.confirmedAmount += r.confirmedAmount ? Number(r.confirmedAmount) : 0;
    } else {
      byTier.set(r.tierName, {
        tierName: r.tierName,
        tierColor: r.tierColor,
        confirmedCount: 1,
        confirmedAmount: r.confirmedAmount ? Number(r.confirmedAmount) : 0,
      });
    }
  }
  return [...byTier.values()].sort((a, b) => b.confirmedAmount - a.confirmedAmount);
}

export async function listMyOpenTasks(
  eventId: string,
  userId: string,
  limit = 10,
): Promise<MyTaskRow[]> {
  try {
    return await queryMyOpenTasks(eventId, userId, limit, true);
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    return queryMyOpenTasks(eventId, userId, limit, false);
  }
}

function queryMyOpenTasks(
  eventId: string,
  userId: string,
  limit: number,
  hideDeleted: boolean,
): Promise<MyTaskRow[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      companyName: companies.name,
      eventCompanyId: tasks.eventCompanyId,
    })
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .where(
      and(
        eq(tasks.eventId, eventId),
        eq(tasks.assignedTo, userId),
        isNull(tasks.completedAt),
        ...(hideDeleted ? [isNull(tasks.deletedAt)] : []),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
}
