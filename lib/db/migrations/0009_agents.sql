-- migration 0009: discovery agent tables
-- agent_run_status enum
DO $$ BEGIN
  CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- company_suggestion_status enum
DO $$ BEGIN
  CREATE TYPE "public"."company_suggestion_status" AS ENUM('pending', 'accepted', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- agent_schedules: one row per event per agent type
CREATE TABLE IF NOT EXISTS "agent_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "agent_type" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "last_run_at" timestamptz,
  "next_run_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- agent_runs: one row per agent execution
CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "agent_type" text NOT NULL,
  "status" "agent_run_status" NOT NULL DEFAULT 'running',
  "suggestion_count" integer NOT NULL DEFAULT 0,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "cached_prompt_tokens" integer NOT NULL DEFAULT 0,
  "search_calls" integer NOT NULL DEFAULT 0,
  "cost_usd" numeric(10, 4) NOT NULL DEFAULT '0',
  "error" text,
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "triggered_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- company_suggestions: candidates proposed by the discovery agent
CREATE TABLE IF NOT EXISTS "company_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_run_id" uuid NOT NULL REFERENCES "agent_runs"("id") ON DELETE CASCADE,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "company_name" text NOT NULL,
  "industry" text,
  "hq_location" text,
  "website" text,
  "rationale" text NOT NULL,
  "match_score" numeric(3, 2),
  "source_urls" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "status" "company_suggestion_status" NOT NULL DEFAULT 'pending',
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamptz,
  "created_company_id" uuid REFERENCES "companies"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- indexes
CREATE UNIQUE INDEX IF NOT EXISTS "agent_schedules_event_type_unique" ON "agent_schedules"("event_id", "agent_type");
CREATE INDEX IF NOT EXISTS "agent_schedules_event_idx" ON "agent_schedules"("event_id");
CREATE INDEX IF NOT EXISTS "agent_runs_event_idx" ON "agent_runs"("event_id", "created_at");
CREATE INDEX IF NOT EXISTS "agent_runs_created_idx" ON "agent_runs"("created_at");
CREATE INDEX IF NOT EXISTS "company_suggestions_event_status_idx" ON "company_suggestions"("event_id", "status");
CREATE INDEX IF NOT EXISTS "company_suggestions_run_idx" ON "company_suggestions"("agent_run_id");
