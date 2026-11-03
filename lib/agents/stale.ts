import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";

/** Runs stuck in `running` past this age are treated as killed/timed out. */
const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * Mark abandoned agent runs as failed. Vercel kills the function at
 * `maxDuration` without running finally blocks, so rows can otherwise sit
 * in `running` forever and inflate the spend cap.
 */
export async function failStaleAgentRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const updated = await db
    .update(agentRuns)
    .set({
      status: "failed",
      error: "Timed out or aborted",
      finishedAt: sql`coalesce(${agentRuns.finishedAt}, now())`,
    })
    .where(
      and(eq(agentRuns.status, "running"), lt(agentRuns.createdAt, cutoff)),
    )
    .returning({ id: agentRuns.id });
  return updated.length;
}
