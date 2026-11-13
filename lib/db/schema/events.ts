import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { eventStatus } from "./enums";
import { users } from "./users";

/** Faculty / course leadership for the conference year. */
export type EventCourseDirector = {
  name: string;
  title?: string | null;
  credentials?: string | null;
};

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
    /** Venue / city shown on the event profile. */
    location: text("location"),
    /** Short event summary for outreach context. */
    description: text("description"),
    courseDirectors: jsonb("course_directors")
      .$type<EventCourseDirector[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Qualitative / programmatic goals (one string per bullet). */
    goals: jsonb("goals")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Target attendee count for the conference year. */
    attendeeGoal: integer("attendee_goal"),
    /** Target number of confirmed sponsors. */
    sponsorCountGoal: integer("sponsor_count_goal"),
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
