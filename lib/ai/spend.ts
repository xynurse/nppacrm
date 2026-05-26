import { and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { enrichmentJobs } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Sum cost_usd for jobs created since the start of today (UTC).
 */
export async function spendToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${enrichmentJobs.costUsd}), 0)`,
    })
    .from(enrichmentJobs)
    .where(
      and(
        gte(enrichmentJobs.createdAt, startOfDay),
        sql`${enrichmentJobs.status} in ('running', 'succeeded')`,
      ),
    );

  return Number(row?.total ?? 0);
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
