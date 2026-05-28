import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { agentRunStatus, companySuggestionStatus } from "./enums";
import { companies } from "./companies";
import { events } from "./events";
import { users } from "./users";

/**
 * One row per event per agent type. Controls enabled/disabled and tracks
 * when the agent last ran. Upserted by the discovery runner on each run.
 */
export const agentSchedules = pgTable(
  "agent_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(), // 'discovery' | 'watch'
    enabled: boolean("enabled").notNull().default(false),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex("agent_schedules_event_type_unique").on(
      table.eventId,
      table.agentType,
    ),
    index("agent_schedules_event_idx").on(table.eventId),
  ],
);

export type AgentSchedule = typeof agentSchedules.$inferSelect;
export type NewAgentSchedule = typeof agentSchedules.$inferInsert;

/**
 * One row per agent execution. Created immediately when a run is triggered;
 * updated with token counts, cost, and final status when complete.
 */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(),
    status: agentRunStatus("status").notNull().default("running"),
    suggestionCount: integer("suggestion_count").notNull().default(0),
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
    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("agent_runs_event_idx").on(table.eventId, table.createdAt),
    index("agent_runs_created_idx").on(table.createdAt),
  ],
);

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

/**
 * Candidate companies proposed by the Discovery agent. Admin reviews each
 * one and either accepts (creates company + eventCompany) or dismisses.
 */
export const companySuggestions = pgTable(
  "company_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    industry: text("industry"),
    hqLocation: text("hq_location"),
    website: text("website"),
    rationale: text("rationale").notNull(),
    matchScore: numeric("match_score", { precision: 3, scale: 2 }),
    sourceUrls: text("source_urls")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    status: companySuggestionStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Set when accepted — links to the created company record.
    createdCompanyId: uuid("created_company_id").references(
      () => companies.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("company_suggestions_event_status_idx").on(
      table.eventId,
      table.status,
    ),
    index("company_suggestions_run_idx").on(table.agentRunId),
  ],
);

export type CompanySuggestion = typeof companySuggestions.$inferSelect;
export type NewCompanySuggestion = typeof companySuggestions.$inferInsert;
