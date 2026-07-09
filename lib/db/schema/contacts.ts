import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { citext } from "./columns";
import { companies } from "./companies";
import { users } from "./users";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    firstName: text("first_name"),
    lastName: text("last_name"),
    fullName: text("full_name").notNull(),
    title: text("title"),
    email: citext("email"),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    isPrimary: boolean("is_primary").notNull().default(false),
    customFields: jsonb("custom_fields")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    notesDoc: jsonb("notes_doc").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("contacts_company_idx").on(table.companyId),
    index("contacts_full_name_idx").on(table.fullName),
    index("contacts_deleted_at_idx").on(table.deletedAt),
  ],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

/**
 * Archive of superseded contact email addresses. A row is written whenever a
 * contact's `email` changes (or is cleared) to a different value — the OLD
 * address is retained here with who changed it and when. `contacts.email`
 * stays the single current address; this is a history-only side table.
 */
export const contactEmailHistory = pgTable(
  "contact_email_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    email: citext("email").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("contact_email_history_contact_idx").on(
      table.contactId,
      table.archivedAt,
    ),
  ],
);

export type ContactEmailHistory = typeof contactEmailHistory.$inferSelect;
export type NewContactEmailHistory = typeof contactEmailHistory.$inferInsert;
