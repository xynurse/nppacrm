CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"entity_type" text,
	"entity_id" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "subcategory" text;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "agreement_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "invoice_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "booth_number" text;--> statement-breakpoint
ALTER TABLE "event_companies" ADD COLUMN "rep_names" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "companies_category_idx" ON "companies" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_companies_paid_at_idx" ON "event_companies" USING btree ("event_id","paid_at");