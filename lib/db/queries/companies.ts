import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
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

/** Escape LIKE wildcards so user input is matched literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

/**
 * Build a wide keyword condition for the companies list. Splits the query into
 * whitespace-separated terms; a row matches when EVERY term is found in at
 * least one field (company name, website, industry, HQ, description, tags,
 * outreach/notes fields, or any of the company's contacts).
 */
function buildCompanyKeywordCondition(keyword: string | null): SQL | null {
  const terms = (keyword ?? "").trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;

  const perTerm = terms.map((term) => {
    const p = likePattern(term);
    return or(
      ilike(companies.name, p),
      ilike(companies.website, p),
      ilike(companies.industry, p),
      ilike(companies.hqLocation, p),
      ilike(companies.shortDescription, p),
      ilike(eventCompanies.companyContext, p),
      ilike(eventCompanies.relationshipNotes, p),
      ilike(eventCompanies.whyTheyShouldAttend, p),
      ilike(eventCompanies.keyTalkingPoints, p),
      ilike(eventCompanies.emailAngle, p),
      ilike(eventCompanies.sponsorshipHook, p),
      sql`array_to_string(${companies.tagsCache}, ' ') ilike ${p}`,
      sql`array_to_string(${eventCompanies.tagsCache}, ' ') ilike ${p}`,
      sql`exists (select 1 from contacts c where c.company_id = ${companies.id} and c.deleted_at is null and (c.full_name ilike ${p} or c.email ilike ${p} or c.title ilike ${p}))`,
    );
  });

  return and(...perTerm) ?? null;
}

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
  proposalUrl: string | null;
  proposalSentAt: Date | null;
  proposalValidUntil: string | null;
  whyTheyShouldAttend: string | null;
  keyTalkingPoints: string | null;
  emailAngle: string | null;
  sponsorshipHook: string | null;
  companyContext: string | null;
  relationshipNotes: string | null;
  tagsCache: string[];
  customFields: Record<string, unknown>;
};

export async function listEventCompanies(
  eventId: string,
  opts: {
    filter?: FilterAst | null;
    sort?: SortSpec | null;
    keyword?: string | null;
  } = {},
): Promise<EventCompanyRow[]> {
  const filterSql = compileFilter(opts.filter ?? null);
  const sortSql = compileSort(opts.sort ?? null);
  const keywordSql = buildCompanyKeywordCondition(opts.keyword ?? null);
  const whereClause: SQL = and(
    eq(eventCompanies.eventId, eventId),
    isNull(eventCompanies.deletedAt),
    isNull(companies.deletedAt),
    ...(filterSql ? [filterSql] : []),
    ...(keywordSql ? [keywordSql] : []),
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
      proposalUrl: eventCompanies.proposalUrl,
      proposalSentAt: eventCompanies.proposalSentAt,
      proposalValidUntil: eventCompanies.proposalValidUntil,
      whyTheyShouldAttend: eventCompanies.whyTheyShouldAttend,
      keyTalkingPoints: eventCompanies.keyTalkingPoints,
      emailAngle: eventCompanies.emailAngle,
      sponsorshipHook: eventCompanies.sponsorshipHook,
      companyContext: eventCompanies.companyContext,
      relationshipNotes: eventCompanies.relationshipNotes,
      tagsCache: eventCompanies.tagsCache,
      customFields: eventCompanies.customFields,
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
      proposalUrl: eventCompanies.proposalUrl,
      proposalSentAt: eventCompanies.proposalSentAt,
      proposalValidUntil: eventCompanies.proposalValidUntil,
      whyTheyShouldAttend: eventCompanies.whyTheyShouldAttend,
      keyTalkingPoints: eventCompanies.keyTalkingPoints,
      emailAngle: eventCompanies.emailAngle,
      sponsorshipHook: eventCompanies.sponsorshipHook,
      companyContext: eventCompanies.companyContext,
      relationshipNotes: eventCompanies.relationshipNotes,
      tagsCache: eventCompanies.tagsCache,
      customFields: eventCompanies.customFields,
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
