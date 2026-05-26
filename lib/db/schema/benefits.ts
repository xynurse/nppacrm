import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { benefitStatus } from "./enums";
import { eventCompanies } from "./event-companies";
import { sponsorshipTiers } from "./sponsorship-tiers";
import { users } from "./users";

export const companyBenefits = pgTable(
  "company_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventCompanyId: uuid("event_company_id")
      .notNull()
      .references(() => eventCompanies.id, { onDelete: "cascade" }),
    /** Snapshot of the tier that produced this benefit at instantiate time. */
    tierId: uuid("tier_id").references(() => sponsorshipTiers.id, {
      onDelete: "set null",
    }),
    /** Stable key from tier.benefits[].key; idempotency lives here. */
    benefitKey: text("benefit_key").notNull(),
    label: text("label").notNull(),
    status: benefitStatus("status").notNull().default("pending"),
    dueAt: date("due_at"),
    note: text("note"),
    /** Default offset (days from event.startDate) captured at instantiate; -30 etc. */
    defaultDueOffsetDays: integer("default_due_offset_days"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveredBy: uuid("delivered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    /** idempotency: one row per (prospect, benefit_key). */
    unique("company_benefits_ec_key_unique").on(
      table.eventCompanyId,
      table.benefitKey,
    ),
    index("company_benefits_ec_idx").on(table.eventCompanyId),
    index("company_benefits_status_due_idx").on(table.status, table.dueAt),
  ],
);

export type CompanyBenefit = typeof companyBenefits.$inferSelect;
export type NewCompanyBenefit = typeof companyBenefits.$inferInsert;
