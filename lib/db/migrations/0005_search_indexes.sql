-- Enable pg_trgm for fuzzy ILIKE / trigram search used by the ⌘K palette.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_trgm_idx"
  ON "companies" USING gin ((LOWER("name")) gin_trgm_ops)
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_full_name_trgm_idx"
  ON "contacts" USING gin ((LOWER("full_name")) gin_trgm_ops)
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_title_trgm_idx"
  ON "tasks" USING gin ((LOWER("title")) gin_trgm_ops)
  WHERE "completed_at" IS NULL;
