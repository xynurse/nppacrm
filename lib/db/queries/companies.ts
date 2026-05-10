import { aliasedTable, and, asc, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  sponsorshipTiers,
  users,
} from "@/lib/db/schema";
import { compileFilter, compileSort } from "@/lib/views/compile";
import type { FilterAst, SortSpec } from "@/lib/views/types";

const owners = aliasedTable(users, "owners");
const targetTiers = aliasedTable(sponsorshipTiers, "target_tiers");
const confirmedTiers = aliasedTable(sponsorshipTiers, "confirmed_tiers");

export type EventCompanyRow = {
  id: string;
  eventId: string;
  companyId: string;
  companyName: string;
  companyWebsite: string | null;
  companyIndustry: string | null;
  companyHqLocation: string | null;
  status: typeof eventCompanies.$inferSelect.status;
  priority: typeof eventCompanies.$inferSelect.priority;
  proposedAmount: string | null;
  confirmedAmount: string | null;
  currency: string;
  ownerId: string | null;
  ownerName: string | null;
  targetTierId: string | null;
  targetTierName: string | null;
  targetTierColor: string | null;
  confirmedTierId: string | null;
  confirmedTierName: string | null;
  nextActionAt: Date | null;
  lastContactedAt: Date | null;
  whyTheyShouldAttend: string | null;
  keyTalkingPoints: string | null;
  emailAngle: string | null;
  sponsorshipHook: string | null;
  companyContext: string | null;
  relationshipNotes: string | null;
  tagsCache: string[];
};

export async function listEventCompanies(
  eventId: string,
  opts: { filter?: FilterAst | null; sort?: SortSpec | null } = {},
): Promise<EventCompanyRow[]> {
  const filterSql = compileFilter(opts.filter ?? null);
  const sortSql = compileSort(opts.sort ?? null);
  const whereClause: SQL = filterSql
    ? and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(companies.deletedAt),
        filterSql,
      )!
    : and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(companies.deletedAt),
      )!;

  const baseQuery = db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      companyId: eventCompanies.companyId,
      companyName: companies.name,
      companyWebsite: companies.website,
      companyIndustry: companies.industry,
      companyHqLocation: companies.hqLocation,
      status: eventCompanies.status,
      priority: eventCompanies.priority,
      proposedAmount: eventCompanies.proposedAmount,
      confirmedAmount: eventCompanies.confirmedAmount,
      currency: eventCompanies.currency,
      ownerId: eventCompanies.ownerId,
      ownerName: owners.name,
      targetTierId: eventCompanies.targetTierId,
      targetTierName: targetTiers.name,
      targetTierColor: targetTiers.color,
      confirmedTierId: eventCompanies.confirmedTierId,
      confirmedTierName: confirmedTiers.name,
      nextActionAt: eventCompanies.nextActionAt,
      lastContactedAt: eventCompanies.lastContactedAt,
      whyTheyShouldAttend: eventCompanies.whyTheyShouldAttend,
      keyTalkingPoints: eventCompanies.keyTalkingPoints,
      emailAngle: eventCompanies.emailAngle,
      sponsorshipHook: eventCompanies.sponsorshipHook,
      companyContext: eventCompanies.companyContext,
      relationshipNotes: eventCompanies.relationshipNotes,
      tagsCache: eventCompanies.tagsCache,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(owners, eq(owners.id, eventCompanies.ownerId))
    .leftJoin(targetTiers, eq(targetTiers.id, eventCompanies.targetTierId))
    .leftJoin(
      confirmedTiers,
      eq(confirmedTiers.id, eventCompanies.confirmedTierId),
    )
    .where(whereClause);

  const rows = sortSql
    ? await baseQuery.orderBy(sortSql)
    : await baseQuery.orderBy(asc(companies.name));

  return rows;
}

export async function getEventCompany(
  id: string,
): Promise<EventCompanyRow | null> {
  const rows = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      companyId: eventCompanies.companyId,
      companyName: companies.name,
      companyWebsite: companies.website,
      companyIndustry: companies.industry,
      companyHqLocation: companies.hqLocation,
      status: eventCompanies.status,
      priority: eventCompanies.priority,
      proposedAmount: eventCompanies.proposedAmount,
      confirmedAmount: eventCompanies.confirmedAmount,
      currency: eventCompanies.currency,
      ownerId: eventCompanies.ownerId,
      ownerName: owners.name,
      targetTierId: eventCompanies.targetTierId,
      targetTierName: targetTiers.name,
      targetTierColor: targetTiers.color,
      confirmedTierId: eventCompanies.confirmedTierId,
      confirmedTierName: confirmedTiers.name,
      nextActionAt: eventCompanies.nextActionAt,
      lastContactedAt: eventCompanies.lastContactedAt,
      whyTheyShouldAttend: eventCompanies.whyTheyShouldAttend,
      keyTalkingPoints: eventCompanies.keyTalkingPoints,
      emailAngle: eventCompanies.emailAngle,
      sponsorshipHook: eventCompanies.sponsorshipHook,
      companyContext: eventCompanies.companyContext,
      relationshipNotes: eventCompanies.relationshipNotes,
      tagsCache: eventCompanies.tagsCache,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(owners, eq(owners.id, eventCompanies.ownerId))
    .leftJoin(targetTiers, eq(targetTiers.id, eventCompanies.targetTierId))
    .leftJoin(
      confirmedTiers,
      eq(confirmedTiers.id, eventCompanies.confirmedTierId),
    )
    .where(
      and(eq(eventCompanies.id, id), isNull(eventCompanies.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listTiersForEvent(eventId: string) {
  return db
    .select()
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.eventId, eventId))
    .orderBy(
      asc(sponsorshipTiers.displayOrder),
      desc(sponsorshipTiers.suggestedAmount),
    );
}
