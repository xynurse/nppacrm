import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentRuns, auditLog, enrichmentJobs } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Sum AI spend since the start of today (UTC) across enrichment jobs, agent
 * runs, and NL-update proposes (cost lives in the audit row).
 */
async function spendToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [[jobs], [agents], [nl]] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${enrichmentJobs.costUsd}), 0)`,
      })
      .from(enrichmentJobs)
      .where(
        and(
          gte(enrichmentJobs.createdAt, startOfDay),
          sql`${enrichmentJobs.status} in ('running', 'succeeded')`,
        ),
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${agentRuns.costUsd}), 0)`,
      })
      .from(agentRuns)
      .where(
        and(
          gte(agentRuns.createdAt, startOfDay),
          sql`${agentRuns.status} in ('running', 'completed')`,
        ),
      ),
    db
      .select({
        total: sql<string>`coalesce(sum((${auditLog.changes}->>'costUsd')::numeric), 0)`,
      })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "ai.nl_update_propose"),
          gte(auditLog.createdAt, startOfDay),
        ),
      ),
  ]);

  return (
    Number(jobs?.total ?? 0) + Number(agents?.total ?? 0) + Number(nl?.total ?? 0)
  );
}

/**
 * Returns true if we're under the daily cap, otherwise false + the remaining
 * spend so the caller can render a clean error.
 */
export async function checkSpendCap(): Promise<{
  ok: boolean;
  spentUsd: number;
  capUsd: number;
}> {
  const spentUsd = await spendToday();
  const capUsd = env.AI_DAILY_SPEND_CAP_USD;
  return { ok: spentUsd < capUsd, spentUsd, capUsd };
}
