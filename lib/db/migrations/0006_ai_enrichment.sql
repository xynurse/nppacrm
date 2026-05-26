CREATE TYPE "public"."enrichment_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "enrichment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_company_id" uuid NOT NULL,
	"status" "enrichment_status" DEFAULT 'pending' NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cached_prompt_tokens" integer DEFAULT 0 NOT NULL,
	"search_calls" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrichment_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"event_company_id" uuid NOT NULL,
	"field" text NOT NULL,
	"suggestion" text NOT NULL,
	"confidence" numeric(3, 2),
	"source_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"reasoning" text,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospectuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"text_content" text NOT NULL,
	"text_token_estimate" integer DEFAULT 0 NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_event_company_id_event_companies_id_fk" FOREIGN KEY ("event_company_id") REFERENCES "public"."event_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_suggestions" ADD CONSTRAINT "enrichment_suggestions_job_id_enrichment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."enrichment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_suggestions" ADD CONSTRAINT "enrichment_suggestions_event_company_id_event_companies_id_fk" FOREIGN KEY ("event_company_id") REFERENCES "public"."event_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_suggestions" ADD CONSTRAINT "enrichment_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectuses" ADD CONSTRAINT "prospectuses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospectuses" ADD CONSTRAINT "prospectuses_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrichment_jobs_event_company_idx" ON "enrichment_jobs" USING btree ("event_company_id","created_at");--> statement-breakpoint
CREATE INDEX "enrichment_jobs_created_idx" ON "enrichment_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrichment_suggestions_ec_status_idx" ON "enrichment_suggestions" USING btree ("event_company_id","status");--> statement-breakpoint
CREATE INDEX "enrichment_suggestions_job_idx" ON "enrichment_suggestions" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospectuses_event_active_unique" ON "prospectuses" USING btree ("event_id") WHERE "prospectuses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "prospectuses_event_idx" ON "prospectuses" USING btree ("event_id");