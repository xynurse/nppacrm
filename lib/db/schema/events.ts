import { sql } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { eventStatus } from "./enums";
import { users } from "./users";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    fundraisingGoal: numeric("fundraising_goal", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    status: eventStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index("events_status_idx").on(table.status)],
);

export const eventReviewers = pgTable(
  "event_reviewers",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("event_reviewers_user_idx").on(table.userId),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventReviewer = typeof eventReviewers.$inferSelect;
