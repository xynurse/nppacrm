-- Additive only. Application code that reads tasks.deleted_at ships after
-- this migration is applied (pnpm db:migrate). Until then, task delete stays
-- a hard delete and queries do not reference the column.
ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "tasks_deleted_at_idx" ON "tasks" USING btree ("deleted_at");
