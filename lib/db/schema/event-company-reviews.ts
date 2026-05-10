import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { eventCompanies } from "./event-companies";
import { reviewVote } from "./enums";
import { users } from "./users";

export const eventCompanyReviews = pgTable(
  "event_company_reviews",
  {
    eventCompanyId: uuid("event_company_id")
      .notNull()
      .references(() => eventCompanies.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: reviewVote("vote").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.eventCompanyId, table.reviewerId] }),
    index("event_company_reviews_reviewer_idx").on(table.reviewerId),
  ],
);

export type EventCompanyReview = typeof eventCompanyReviews.$inferSelect;
export type NewEventCompanyReview = typeof eventCompanyReviews.$inferInsert;
