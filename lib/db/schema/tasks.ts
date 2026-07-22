import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RichDoc } from "@/lib/tiptap/types";
import { prospectPriority } from "./enums";
import { eventCompanies } from "./event-companies";
import { events } from "./events";
import { users } from "./users";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    eventCompanyId: uuid("event_company_id").references(
      () => eventCompanies.id,
      { onDelete: "cascade" },
    ),
    title: text("title").notNull(),
    /** Plain-text mirror of `descriptionDoc`, kept in sync on every write. */
    description: text("description"),
    descriptionDoc: jsonb("description_doc").$type<RichDoc | null>(),
    dueDate: date("due_date"),
    priority: prospectPriority("priority").notNull().default("medium"),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("tasks_event_idx").on(table.eventId),
    index("tasks_ec_idx").on(table.eventCompanyId),
    index("tasks_assignee_due_idx").on(table.assignedTo, table.dueDate),
    index("tasks_event_open_idx")
      .on(table.eventId, table.dueDate)
      .where(sql`${table.completedAt} IS NULL`),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
