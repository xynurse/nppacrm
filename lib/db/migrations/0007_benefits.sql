CREATE TYPE "public"."benefit_status" AS ENUM('pending', 'in_progress', 'delivered', 'skipped');--> statement-breakpoint
CREATE TABLE "company_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_company_id" uuid NOT NULL,
	"tier_id" uuid,
	"benefit_key" text NOT NULL,
	"label" text NOT NULL,
	"status" "benefit_status" DEFAULT 'pending' NOT NULL,
	"due_at" date,
	"note" text,
	"default_due_offset_days" integer,
	"delivered_at" timestamp with time zone,
	"delivered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "company_benefits_ec_key_unique" UNIQUE("event_company_id","benefit_key")
);
--> statement-breakpoint
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_event_company_id_event_companies_id_fk" FOREIGN KEY ("event_company_id") REFERENCES "public"."event_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_tier_id_sponsorship_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."sponsorship_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_delivered_by_users_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_benefits" ADD CONSTRAINT "company_benefits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_benefits_ec_idx" ON "company_benefits" USING btree ("event_company_id");--> statement-breakpoint
CREATE INDEX "company_benefits_status_due_idx" ON "company_benefits" USING btree ("status","due_at");