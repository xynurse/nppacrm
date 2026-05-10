import { aliasedTable, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, interactions, users } from "@/lib/db/schema";

const authors = aliasedTable(users, "interaction_authors");

export type InteractionRow = {
  id: string;
  eventCompanyId: string;
  contactId: string | null;
  contactName: string | null;
  userId: string | null;
  userName: string | null;
  type: typeof interactions.$inferSelect.type;
  subject: string | null;
  body: string | null;
  occurredAt: Date;
  createdAt: Date;
};

export async function listInteractionsForEventCompany(
  eventCompanyId: string,
  limit = 50,
): Promise<InteractionRow[]> {
  const rows = await db
    .select({
      id: interactions.id,
      eventCompanyId: interactions.eventCompanyId,
      contactId: interactions.contactId,
      contactName: contacts.fullName,
      userId: interactions.userId,
      userName: authors.name,
      type: interactions.type,
      subject: interactions.subject,
      body: interactions.body,
      occurredAt: interactions.occurredAt,
      createdAt: interactions.createdAt,
    })
    .from(interactions)
    .leftJoin(contacts, eq(contacts.id, interactions.contactId))
    .leftJoin(authors, eq(authors.id, interactions.userId))
    .where(eq(interactions.eventCompanyId, eventCompanyId))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
  return rows;
}

export async function listRecentInteractionsForEvent(
  eventId: string,
  limit = 20,
) {
  return db
    .select({
      id: interactions.id,
      eventCompanyId: interactions.eventCompanyId,
      type: interactions.type,
      subject: interactions.subject,
      occurredAt: interactions.occurredAt,
      userName: authors.name,
    })
    .from(interactions)
    .leftJoin(authors, eq(authors.id, interactions.userId))
    .where(eq(interactions.eventId, eventId))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}
