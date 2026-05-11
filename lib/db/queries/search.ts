import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  contacts,
  eventCompanies,
  tasks,
} from "@/lib/db/schema";

export type SearchResult =
  | {
      kind: "company";
      id: string;
      eventCompanyId: string;
      label: string;
      hint: string | null;
      href: string;
    }
  | {
      kind: "contact";
      id: string;
      eventCompanyId: string;
      label: string;
      hint: string | null;
      href: string;
    }
  | {
      kind: "task";
      id: string;
      label: string;
      hint: string | null;
      href: string;
    };

export async function searchAll(
  eventId: string,
  query: string,
  limit = 8,
): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const pattern = `%${q.toLowerCase()}%`;

  const [companyRows, contactRows, taskRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        eventCompanyId: eventCompanies.id,
        name: companies.name,
        industry: companies.industry,
      })
      .from(eventCompanies)
      .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
      .where(
        and(
          eq(eventCompanies.eventId, eventId),
          isNull(eventCompanies.deletedAt),
          isNull(companies.deletedAt),
          sql`LOWER(${companies.name}) LIKE ${pattern}`,
        ),
      )
      .orderBy(companies.name)
      .limit(limit),
    db
      .select({
        id: contacts.id,
        eventCompanyId: eventCompanies.id,
        fullName: contacts.fullName,
        title: contacts.title,
        companyName: companies.name,
      })
      .from(contacts)
      .innerJoin(companies, eq(companies.id, contacts.companyId))
      .innerJoin(
        eventCompanies,
        and(
          eq(eventCompanies.companyId, companies.id),
          eq(eventCompanies.eventId, eventId),
          isNull(eventCompanies.deletedAt),
        ),
      )
      .where(
        and(
          isNull(contacts.deletedAt),
          sql`LOWER(${contacts.fullName}) LIKE ${pattern}`,
        ),
      )
      .orderBy(contacts.fullName)
      .limit(limit),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        companyName: companies.name,
      })
      .from(tasks)
      .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
      .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
      .where(
        and(
          eq(tasks.eventId, eventId),
          ilike(tasks.title, `%${q}%`),
        ),
      )
      .orderBy(tasks.dueDate)
      .limit(limit),
  ]);

  const results: SearchResult[] = [];
  for (const c of companyRows) {
    results.push({
      kind: "company",
      id: c.id,
      eventCompanyId: c.eventCompanyId,
      label: c.name,
      hint: c.industry,
      href: `/companies?record=${c.eventCompanyId}`,
    });
  }
  for (const c of contactRows) {
    results.push({
      kind: "contact",
      id: c.id,
      eventCompanyId: c.eventCompanyId,
      label: c.fullName,
      hint: c.title ? `${c.title} · ${c.companyName}` : c.companyName,
      href: `/companies?record=${c.eventCompanyId}`,
    });
  }
  for (const t of taskRows) {
    results.push({
      kind: "task",
      id: t.id,
      label: t.title,
      hint: t.companyName ?? null,
      href: `/tasks`,
    });
  }
  return results;
}
