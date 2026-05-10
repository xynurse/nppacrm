CREATE TYPE "public"."prospect_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('prospect', 'contacted', 'engaged', 'proposal_sent', 'negotiating', 'committed', 'confirmed', 'declined', 'past_sponsor');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"size_band" text,
	"hq_location" text,
	"logo_url" text,
	"short_description" text,
	"notes_doc" jsonb,
	"tags_cache" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "prospect_status" DEFAULT 'prospect' NOT NULL,
	"priority" "prospect_priority" DEFAULT 'medium' NOT NULL,
	"owner_id" uuid,
	"target_tier_id" uuid,
	"confirmed_tier_id" uuid,
	"proposed_amount" numeric(14, 2),
	"confirmed_amount" numeric(14, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"next_action_at" timestamp with time zone,
	"first_contacted_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"why_they_should_attend" text,
	"key_talking_points" text,
	"email_angle" text,
	"sponsorship_hook" text,
	"company_context" text,
	"relationship_notes" text,
	"contact_source_notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags_cache" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "event_companies_event_company_unique" UNIQUE("event_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "sponsorship_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"suggested_amount" numeric(14, 2),
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_tags" (
	"company_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "company_tags_company_id_tag_id_pk" PRIMARY KEY("company_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#94a3b8' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_target_tier_id_sponsorship_tiers_id_fk" FOREIGN KEY ("target_tier_id") REFERENCES "public"."sponsorship_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_confirmed_tier_id_sponsorship_tiers_id_fk" FOREIGN KEY ("confirmed_tier_id") REFERENCES "public"."sponsorship_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_companies" ADD CONSTRAINT "event_companies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_tags" ADD CONSTRAINT "company_tags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_tags" ADD CONSTRAINT "company_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_deleted_at_idx" ON "companies" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "event_companies_event_status_idx" ON "event_companies" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_companies_event_owner_idx" ON "event_companies" USING btree ("event_id","owner_id");--> statement-breakpoint
CREATE INDEX "event_companies_event_priority_idx" ON "event_companies" USING btree ("event_id","priority");--> statement-breakpoint
CREATE INDEX "event_companies_deleted_at_idx" ON "event_companies" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "event_companies_last_contacted_idx" ON "event_companies" USING btree ("event_id","last_contacted_at");--> statement-breakpoint
CREATE INDEX "sponsorship_tiers_event_idx" ON "sponsorship_tiers" USING btree ("event_id","display_order");--> statement-breakpoint
CREATE INDEX "company_tags_tag_idx" ON "company_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX "companies_name_trgm_idx" ON "companies" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "companies_tags_cache_gin_idx" ON "companies" USING gin ("tags_cache");--> statement-breakpoint
CREATE INDEX "event_companies_tags_cache_gin_idx" ON "event_companies" USING gin ("tags_cache");--> statement-breakpoint
CREATE INDEX "event_companies_custom_fields_gin_idx" ON "event_companies" USING gin ("custom_fields");--> statement-breakpoint
CREATE INDEX "event_companies_active_idx" ON "event_companies" ("event_id", "status") WHERE "deleted_at" IS NULL;