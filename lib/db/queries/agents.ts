import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentRuns,
  agentSchedules,
  companySuggestions,
  users,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Agent schedules
// ---------------------------------------------------------------------------

export async function getAgentSchedule(
  eventId: string,
  agentType: string,
): Promise<{ enabled: boolean; lastRunAt: Date | null } | null> {
  const [row] = await db
    .select({
      enabled: agentSchedules.enabled,
      lastRunAt: agentSchedules.lastRunAt,
    })
    .from(agentSchedules)
    .where(
      and(
        eq(agentSchedules.eventId, eventId),
        eq(agentSchedules.agentType, agentType),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Agent runs (recent history)
// ---------------------------------------------------------------------------

export type AgentRunRow = {
  id: string;
  agentType: string;
  status: string;
  suggestionCount: number;
  costUsd: string;
  searchCalls: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  triggeredByName: string | null;
};

export async function listAgentRuns(
  eventId: string,
  limit = 10,
): Promise<AgentRunRow[]> {
  const rows = await db
    .select({
      id: agentRuns.id,
      agentType: agentRuns.agentType,
      status: agentRuns.status,
      suggestionCount: agentRuns.suggestionCount,
      costUsd: agentRuns.costUsd,
      searchCalls: agentRuns.searchCalls,
      error: agentRuns.error,
      startedAt: agentRuns.startedAt,
      finishedAt: agentRuns.finishedAt,
      createdAt: agentRuns.createdAt,
      triggeredByName: users.name,
    })
    .from(agentRuns)
    .leftJoin(users, eq(agentRuns.triggeredBy, users.id))
    .where(eq(agentRuns.eventId, eventId))
    .orderBy(desc(agentRuns.createdAt))
    .limit(limit);
  return rows;
}

// ---------------------------------------------------------------------------
// Company suggestions
// ---------------------------------------------------------------------------

export type CompanySuggestionRow = {
  id: string;
  agentRunId: string;
  companyName: string;
  industry: string | null;
  hqLocation: string | null;
  website: string | null;
  rationale: string;
  matchScore: string | null;
  sourceUrls: string[];
  status: string;
  createdAt: Date;
};

export async function listPendingSuggestions(
  eventId: string,
): Promise<CompanySuggestionRow[]> {
  return db
    .select({
      id: companySuggestions.id,
      agentRunId: companySuggestions.agentRunId,
      companyName: companySuggestions.companyName,
      industry: companySuggestions.industry,
      hqLocation: companySuggestions.hqLocation,
      website: companySuggestions.website,
      rationale: companySuggestions.rationale,
      matchScore: companySuggestions.matchScore,
      sourceUrls: companySuggestions.sourceUrls,
      status: companySuggestions.status,
      createdAt: companySuggestions.createdAt,
    })
    .from(companySuggestions)
    .where(
      and(
        eq(companySuggestions.eventId, eventId),
        eq(companySuggestions.status, "pending"),
      ),
    )
    .orderBy(desc(companySuggestions.createdAt));
}
