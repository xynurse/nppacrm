import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { aiConfigurationStatus } from "@/lib/ai/gateway";
import { checkSpendCap } from "@/lib/ai/spend";
import { runDiscovery } from "@/lib/agents/discovery";
import { failStaleAgentRuns } from "@/lib/agents/stale";
import { mapPool } from "@/lib/async/map-pool";
import { db } from "@/lib/db";
import { agentSchedules, events } from "@/lib/db/schema";
import { env } from "@/lib/env";

/** Vercel hobby/pro allow up to 300s; leave headroom before the hard kill. */
export const maxDuration = 300;

const EVENT_CONCURRENCY = 2;

// Vercel cron jobs send a GET request.
// We authenticate via a shared secret in the Authorization header.
export async function GET(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const secret = env.CRON_SECRET;

  if (secret) {
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, always require the secret.
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

  // ── Find events with discovery enabled ─────────────────────────────────────
  const schedules = await db
    .select({
      eventId: agentSchedules.eventId,
    })
    .from(agentSchedules)
    .innerJoin(events, eq(events.id, agentSchedules.eventId))
    .where(
      and(
        eq(agentSchedules.agentType, "discovery"),
        eq(agentSchedules.enabled, true),
        eq(events.status, "active"),
      ),
    );

  if (schedules.length === 0) {
    return NextResponse.json({ message: "No events with discovery enabled", ran: 0 });
  }

  const results: Array<{ eventId: string; runId: string; count: number }> = [];
  const errors: Array<{ eventId: string; error: string }> = [];

  await mapPool(schedules, EVENT_CONCURRENCY, async ({ eventId }) => {
    try {
      const result = await runDiscovery({ eventId, triggeredBy: null });
      results.push({ eventId, ...result });
    } catch (err) {
      errors.push({
        eventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return NextResponse.json({
    message: `Discovery cron complete`,
    ran: results.length,
    results,
    errors,
  });
}
