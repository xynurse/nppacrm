import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";
import type { FilterAst, SortSpec, ViewScope } from "@/lib/views/types";

export const savedViews = pgTable(
  "saved_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scope: text("scope").$type<ViewScope>().notNull().default("companies"),
    name: text("name").notNull(),
    isShared: boolean("is_shared").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    filter: jsonb("filter").$type<FilterAst>().notNull().default(
      sql`'{"op":"and","conditions":[]}'::jsonb`,
    ),
    sort: jsonb("sort").$type<SortSpec>().notNull().default(
      sql`'[]'::jsonb`,
    ),
    columns: jsonb("columns").$type<string[]>().notNull().default(
      sql`'[]'::jsonb`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("saved_views_event_scope_idx").on(table.eventId, table.scope),
    index("saved_views_owner_idx").on(table.ownerId),
    unique("saved_views_event_owner_name_unique").on(
      table.eventId,
      table.ownerId,
      table.scope,
      table.name,
    ),
  ],
);

export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;
