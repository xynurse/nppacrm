ALTER TABLE "event_companies" ADD COLUMN "proposal_url" text;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "proposal_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "proposal_valid_until" date;