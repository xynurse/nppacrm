import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, contacts, eventCompanies } from "@/lib/db/schema";

/** Escape LIKE wildcards so user input is matched literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

/**
 * Keyword condition for the contacts directory. Every whitespace-separated
 * term must match at least one field (name, email, title, phone, or company).
 */
function buildContactKeywordCondition(keyword: string | null): SQL | null {
  const terms = (keyword ?? "").trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  const perTerm = terms.map((term) => {
    const p = likePattern(term);
    return or(
      ilike(contacts.fullName, p),
      ilike(contacts.email, p),
      ilike(contacts.title, p),
      ilike(contacts.phone, p),
      ilike(companies.name, p),
    );
  });
  return and(...perTerm) ?? null;
}

export type ContactRow = {
  id: string;
  companyId: string;
  companyName: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactDirectoryRow = ContactRow & {
  eventCompanyId: string;
};

export async function listContactsForCompany(
  companyId: string,
): Promise<ContactRow[]> {
  const rows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      companyName: companies.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      isPrimary: contacts.isPrimary,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(eq(contacts.companyId, companyId), isNull(contacts.deletedAt)),
    )
    .orderBy(desc(contacts.isPrimary), asc(contacts.fullName));
  return rows;
}

export async function listContactsForEvent(
  eventId: string,
  opts: { keyword?: string | null } = {},
): Promise<ContactDirectoryRow[]> {
  const keywordSql = buildContactKeywordCondition(opts.keyword ?? null);
  const rows = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      companyName: companies.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      fullName: contacts.fullName,
      title: contacts.title,
      email: contacts.email,
      phone: contacts.phone,
      linkedinUrl: contacts.linkedinUrl,
      isPrimary: contacts.isPrimary,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      eventCompanyId: eventCompanies.id,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.companyId, contacts.companyId),
    )
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(contacts.deletedAt),
        isNull(companies.deletedAt),
        ...(keywordSql ? [keywordSql] : []),
      ),
    )
    .orderBy(asc(companies.name), desc(contacts.isPrimary), asc(contacts.fullName));
  return rows;
}
