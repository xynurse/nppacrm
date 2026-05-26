import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  enrichmentStatus,
  suggestionStatus,
} from "./enums";
import { eventCompanies } from "./event-companies";
import { events } from "./events";
import { users } from "./users";

export const prospectuses = pgTable(
  "prospectuses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    textContent: text("text_content").notNull(),
    textTokenEstimate: integer("text_token_estimate").notNull().default(0),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("prospectuses_event_active_unique")
      .on(table.eventId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("prospectuses_event_idx").on(table.eventId),
  ],
);

export type Prospectus = typeof prospectuses.$inferSelect;
export type NewProspectus = typeof prospectuses.$inferInsert;

export const enrichmentJobs = pgTable(
  "enrichment_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventCompanyId: uuid("event_company_id")
      .notNull()
      .references(() => eventCompanies.id, { onDelete: "cascade" }),
    status: enrichmentStatus("status").notNull().default("pending"),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    cachedPromptTokens: integer("cached_prompt_tokens").notNull().default(0),
    searchCalls: integer("search_calls").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("enrichment_jobs_event_company_idx").on(
      table.eventCompanyId,
      table.createdAt,
    ),
    index("enrichment_jobs_created_idx").on(table.createdAt),
  ],
);

export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;
export type NewEnrichmentJob = typeof enrichmentJobs.$inferInsert;

export const enrichmentSuggestions = pgTable(
  "enrichment_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => enrichmentJobs.id, { onDelete: "cascade" }),
    eventCompanyId: uuid("event_company_id")
      .notNull()
      .references(() => eventCompanies.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    suggestion: text("suggestion").notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    sourceUrls: text("source_urls")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    reasoning: text("reasoning"),
    status: suggestionStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("enrichment_suggestions_ec_status_idx").on(
      table.eventCompanyId,
      table.status,
    ),
    index("enrichment_suggestions_job_idx").on(table.jobId),
  ],
);

export type EnrichmentSuggestion = typeof enrichmentSuggestions.$inferSelect;
export type NewEnrichmentSuggestion = typeof enrichmentSuggestions.$inferInsert;
