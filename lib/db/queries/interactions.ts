import { aliasedTable, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUndefinedColumnError } from "@/lib/db/errors";
import { contacts, interactions, users } from "@/lib/db/schema";
import type { RichDoc } from "@/lib/tiptap/types";

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
  bodyDoc: RichDoc | null;
  occurredAt: Date;
  createdAt: Date;
};

const legacySelect = {
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
} as const;

const baseSelect = {
  ...legacySelect,
  bodyDoc: interactions.bodyDoc,
} as const;

type InteractionSelect = typeof baseSelect;

export async function listInteractionsForEventCompany(
  eventCompanyId: string,
  limit = 50,
): Promise<InteractionRow[]> {
  const query = (select: InteractionSelect): Promise<InteractionRow[]> =>
    db
      .select(select)
      .from(interactions)
      .leftJoin(contacts, eq(contacts.id, interactions.contactId))
      .leftJoin(authors, eq(authors.id, interactions.userId))
      .where(eq(interactions.eventCompanyId, eventCompanyId))
      .orderBy(desc(interactions.occurredAt))
      .limit(limit);

  try {
    return await query(baseSelect);
  } catch (err) {
    // Migration 0011 hasn't run yet — fall back to the plain-text column so
    // the drawer still renders every interaction.
    if (!isUndefinedColumnError(err)) throw err;
    const rows = await query(legacySelect as unknown as InteractionSelect);
    return rows.map((row) => ({ ...row, bodyDoc: null }));
  }
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
