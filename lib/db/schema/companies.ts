import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    website: text("website"),
    industry: text("industry"),
    sizeBand: text("size_band"),
    hqLocation: text("hq_location"),
    logoUrl: text("logo_url"),
    shortDescription: text("short_description"),
    notesDoc: jsonb("notes_doc").$type<Record<string, unknown> | null>(),
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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("companies_name_idx").on(table.name),
    index("companies_deleted_at_idx").on(table.deletedAt),
  ],
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
