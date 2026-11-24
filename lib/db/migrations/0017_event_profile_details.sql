-- Additive event profile fields: course directors, goals, location,
-- description, and count targets. Apply with `pnpm db:migrate` on prod
-- before relying on the enriched /event page (schema selects these cols).
ALTER TABLE "events" ADD COLUMN "location" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "course_directors" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "goals" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "attendee_goal" integer;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "sponsor_count_goal" integer;
