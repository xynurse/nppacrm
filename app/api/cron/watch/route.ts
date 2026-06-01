import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { aiConfigurationStatus } from "@/lib/ai/gateway";
import { db } from "@/lib/db";
import { agentSchedules, events } from "@/lib/db/schema";
import { runWatch } from "@/lib/agents/watch";
import { env } from "@/lib/env";

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

  // ── Gate on AI config ───────────────────────────────────────────────────────
  const aiStatus = aiConfigurationStatus();
  if (!aiStatus.ok) {
    return NextResponse.json(
      { error: "AI not configured", reason: aiStatus.reason },
      { status: 503 },
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

  // ── Run watch for each event ─────────────────────────────────────────────────
  const results: Array<{
    eventId: string;
    runId: string;
    count: number;
    totalCostUsd: number;
  }> = [];
  const errors: Array<{ eventId: string; error: string }> = [];

  for (const { eventId } of schedules) {
    try {
      const result = await runWatch({ eventId, triggeredBy: null });
      results.push({ eventId, ...result });
    } catch (err) {
      errors.push({
        eventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    message: "Watch cron complete",
    ran: results.length,
    results,
    errors,
  });
}
