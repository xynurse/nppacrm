import { and, asc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, eventCompanies } from "@/lib/db/schema";

export type DuplicateCandidate = {
  id: string;
  name: string;
  website: string | null;
  normalized: string;
};

export type DuplicateGroup = {
  key: string;
  companies: DuplicateCandidate[];
};

/** Normalize company names for fuzzy duplicate grouping. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/&/g, " and ")
    .replace(
      /\b(incorporated|inc|llc|ltd|corp|corporation|co|company)\b\.?/gu,
      " ",
    )
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Find live companies that share a normalized name (exact after strip of
 * legal suffixes / punctuation). Groups of size ≥ 2 are returned.
 */
export async function findDuplicateCompanyGroups(): Promise<DuplicateGroup[]> {
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      website: companies.website,
    })
    .from(companies)
    .where(isNull(companies.deletedAt))
    .orderBy(asc(companies.name));

  const buckets = new Map<string, DuplicateCandidate[]>();
  for (const r of rows) {
    const normalized = normalizeCompanyName(r.name);
    if (!normalized) continue;
    const entry: DuplicateCandidate = {
      id: r.id,
      name: r.name,
      website: r.website,
      normalized,
    };
    const list = buckets.get(normalized) ?? [];
    list.push(entry);
    buckets.set(normalized, list);
  }

  return Array.from(buckets.entries())
    .filter(([, list]) => list.length >= 2)
    .map(([key, list]) => ({ key, companies: list }))
    .sort(
      (a, b) =>
        b.companies.length - a.companies.length || a.key.localeCompare(b.key),
    );
}

/** Count how many event_company rows each company has (any event). */
export async function countEventLinksForCompanies(
  companyIds: string[],
): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map();
  const rows = await db
    .select({
      companyId: eventCompanies.companyId,
      n: sql<number>`count(*)::int`,
    })
    .from(eventCompanies)
    .where(
      and(
        inArray(eventCompanies.companyId, companyIds),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .groupBy(eventCompanies.companyId);
  return new Map(rows.map((r) => [r.companyId, r.n]));
}
