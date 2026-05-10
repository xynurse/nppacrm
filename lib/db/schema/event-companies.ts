import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";
import { events } from "./events";
import { prospectPriority, prospectStatus } from "./enums";
import { sponsorshipTiers } from "./sponsorship-tiers";
import { users } from "./users";

export const eventCompanies = pgTable(
  "event_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: prospectStatus("status").notNull().default("prospect"),
    priority: prospectPriority("priority").notNull().default("medium"),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetTierId: uuid("target_tier_id").references(() => sponsorshipTiers.id, {
      onDelete: "set null",
    }),
    confirmedTierId: uuid("confirmed_tier_id").references(
      () => sponsorshipTiers.id,
      { onDelete: "set null" },
    ),
    proposedAmount: numeric("proposed_amount", { precision: 14, scale: 2 }),
    confirmedAmount: numeric("confirmed_amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    firstContactedAt: timestamp("first_contacted_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    whyTheyShouldAttend: text("why_they_should_attend"),
    keyTalkingPoints: text("key_talking_points"),
    emailAngle: text("email_angle"),
    sponsorshipHook: text("sponsorship_hook"),
    companyContext: text("company_context"),
    relationshipNotes: text("relationship_notes"),
    contactSourceNotes: text("contact_source_notes"),
    customFields: jsonb("custom_fields")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    tagsCache: text("tags_cache")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("event_companies_event_company_unique").on(
      table.eventId,
      table.companyId,
    ),
    index("event_companies_event_status_idx").on(table.eventId, table.status),
    index("event_companies_event_owner_idx").on(table.eventId, table.ownerId),
    index("event_companies_event_priority_idx").on(
      table.eventId,
      table.priority,
    ),
    index("event_companies_deleted_at_idx").on(table.deletedAt),
    index("event_companies_last_contacted_idx").on(
      table.eventId,
      table.lastContactedAt,
    ),
  ],
);

export type EventCompany = typeof eventCompanies.$inferSelect;
export type NewEventCompany = typeof eventCompanies.$inferInsert;
