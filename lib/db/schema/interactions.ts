import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RichDoc } from "@/lib/tiptap/types";
import { contacts } from "./contacts";
import { interactionType } from "./enums";
import { eventCompanies } from "./event-companies";
import { events } from "./events";
import { users } from "./users";

export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    eventCompanyId: uuid("event_company_id")
      .notNull()
      .references(() => eventCompanies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: interactionType("type").notNull(),
    subject: text("subject"),
    /** Plain-text mirror of `bodyDoc`, kept in sync on every write. Read by
     * AI prompts, CSV export, and the `/sync-outreach` skill. */
    body: text("body"),
    bodyDoc: jsonb("body_doc").$type<RichDoc | null>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("interactions_ec_occurred_idx").on(
      table.eventCompanyId,
      table.occurredAt,
    ),
    index("interactions_event_occurred_idx").on(
      table.eventId,
      table.occurredAt,
    ),
    index("interactions_user_idx").on(table.userId, table.createdAt),
  ],
);

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;
