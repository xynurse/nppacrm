import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { events } from "./events";

export type TierBenefit = {
  key: string;
  label: string;
  defaultDueOffsetDays?: number;
};

export const sponsorshipTiers = pgTable(
  "sponsorship_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#64748b"),
    displayOrder: integer("display_order").notNull().default(0),
    suggestedAmount: numeric("suggested_amount", { precision: 14, scale: 2 }),
    /** Soft capacity — how many of this tier you intend to sell. Null = unlimited. */
    inventoryLimit: integer("inventory_limit"),
    benefits: jsonb("benefits")
      .$type<TierBenefit[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("sponsorship_tiers_event_idx").on(table.eventId, table.displayOrder),
  ],
);

export type SponsorshipTier = typeof sponsorshipTiers.$inferSelect;
export type NewSponsorshipTier = typeof sponsorshipTiers.$inferInsert;
