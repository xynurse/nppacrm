import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { aiConfigurationStatus } from "@/lib/ai/gateway";
import { checkSpendCap } from "@/lib/ai/spend";
import { failStaleAgentRuns } from "@/lib/agents/stale";
import { runWatch } from "@/lib/agents/watch";
import { mapPool } from "@/lib/async/map-pool";
import { db } from "@/lib/db";
import { agentSchedules, events } from "@/lib/db/schema";
import { env } from "@/lib/env";

/** Vercel hobby/pro allow up to 300s; leave headroom before the hard kill. */
export const maxDuration = 300;

const EVENT_CONCURRENCY = 2;

export async function GET(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const secret = env.CRON_SECRET;

  if (secret) {
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  await failStaleAgentRuns();

  // ── Gate on AI config ───────────────────────────────────────────────────────
  const aiStatus = aiConfigurationStatus();
  if (!aiStatus.ok) {
    return NextResponse.json(
      { error: "AI not configured", reason: aiStatus.reason },
      { status: 503 },
    );
  }

  const spend = await checkSpendCap();
  if (!spend.ok) {
    return NextResponse.json(
      {
        error: "Daily AI spend cap reached",
        spentUsd: spend.spentUsd,
        capUsd: spend.capUsd,
      },
      { status: 429 },
    );
  }

  // ── Find events with watch enabled ──────────────────────────────────────────
  const schedules = await db
    .select({ eventId: agentSchedules.eventId })
    .from(agentSchedules)
    .innerJoin(events, eq(events.id, agentSchedules.eventId))
    .where(
      and(
        eq(agentSchedules.agentType, "watch"),
        eq(agentSchedules.enabled, true),
        eq(events.status, "active"),
      ),
    );

  if (schedules.length === 0) {
    return NextResponse.json({ message: "No events with watch enabled", ran: 0 });
  }

  // Abort a bit before Vercel kills the function so we can mark the run failed.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), (maxDuration - 20) * 1000);

  const results: Array<{
    eventId: string;
    runId: string;
    count: number;
    totalCostUsd: number;
  }> = [];
  const errors: Array<{ eventId: string; error: string }> = [];

  try {
    await mapPool(schedules, EVENT_CONCURRENCY, async ({ eventId }) => {
      if (controller.signal.aborted) {
        errors.push({ eventId, error: "Aborted (maxDuration)" });
        return;
      }
      try {
        const result = await runWatch({
          eventId,
          triggeredBy: null,
          signal: controller.signal,
        });
        results.push({ eventId, ...result });
      } catch (err) {
        errors.push({
          eventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  } finally {
    clearTimeout(abortTimer);
  }

  return NextResponse.json({
    message: "Watch cron complete",
    ran: results.length,
    results,
    errors,
  });
}
