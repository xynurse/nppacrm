"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiConfigurationStatus } from "@/lib/ai/gateway";
import { checkSpendCap } from "@/lib/ai/spend";
import { runDiscovery } from "@/lib/agents/discovery";
import { runWatch } from "@/lib/agents/watch";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  agentSchedules,
  companies,
  companySuggestions,
  eventCompanies,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Toggle agent enabled/disabled
// ---------------------------------------------------------------------------

const toggleSchema = z.object({
  eventId: z.uuid(),
  agentType: z.enum(["discovery", "watch"]),
  enabled: z.boolean(),
});

export async function toggleAgent(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { eventId, agentType, enabled } = parsed.data;

  await db
    .insert(agentSchedules)
    .values({ eventId, agentType, enabled })
    .onConflictDoUpdate({
      target: [agentSchedules.eventId, agentSchedules.agentType],
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath(`/admin/events/${eventId}/agents`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Run discovery agent manually
// ---------------------------------------------------------------------------

const runSchema = z.object({ eventId: z.uuid() });

export async function runDiscoveryAgent(
  raw: unknown,
): Promise<
  | { ok: true; runId: string; count: number }
  | { ok: false; error: string }
> {
  const session = await requireAdmin();

  const parsed = runSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { eventId } = parsed.data;

  // Gate on AI config
  const aiStatus = aiConfigurationStatus();
  if (!aiStatus.ok) return { ok: false, error: aiStatus.reason! };

  // Gate on daily spend cap
  const spendOk = await checkSpendCap();
  if (!spendOk)
    return {
      ok: false,
      error: "Daily AI spend cap reached. Try again tomorrow.",
    };

  try {
    const result = await runDiscovery({
      eventId,
      triggeredBy: session.user.id,
    });

    await recordAudit({
      userId: session.user.id,
      eventId,
      action: "agent.discovery_run",
      entityType: "agentRun",
      entityId: result.runId,
      changes: { count: result.count },
    });

    revalidatePath(`/admin/events/${eventId}/agents`);
    return { ok: true, runId: result.runId, count: result.count };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Agent run failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Run watch agent manually
// ---------------------------------------------------------------------------

export async function runWatchAgent(
  raw: unknown,
): Promise<
  | { ok: true; runId: string; count: number }
  | { ok: false; error: string }
> {
  const session = await requireAdmin();

  const parsed = runSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { eventId } = parsed.data;

  // Gate on AI config
  const aiStatus = aiConfigurationStatus();
  if (!aiStatus.ok) return { ok: false, error: aiStatus.reason! };

  // Gate on daily spend cap
  const spendOk = await checkSpendCap();
  if (!spendOk)
    return {
      ok: false,
      error: "Daily AI spend cap reached. Try again tomorrow.",
    };

  try {
    const result = await runWatch({
      eventId,
      triggeredBy: session.user.id,
    });

    await recordAudit({
      userId: session.user.id,
      eventId,
      action: "agent.watch_run",
      entityType: "agentRun",
      entityId: result.runId,
      changes: { count: result.count },
    });

    revalidatePath(`/admin/events/${eventId}/agents`);
    return { ok: true, runId: result.runId, count: result.count };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Agent run failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Accept a company suggestion → create company + add to event
// ---------------------------------------------------------------------------

const acceptSchema = z.object({
  suggestionId: z.uuid(),
  eventId: z.uuid(),
});

export async function acceptCompanySuggestion(
  raw: unknown,
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const parsed = acceptSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { suggestionId, eventId } = parsed.data;

  const [suggestion] = await db
    .select()
    .from(companySuggestions)
    .where(
      and(
        eq(companySuggestions.id, suggestionId),
        eq(companySuggestions.status, "pending"),
      ),
    )
    .limit(1);

  if (!suggestion) return { ok: false, error: "Suggestion not found or already reviewed" };

  // Create the company record
  const [company] = await db
    .insert(companies)
    .values({
      name: suggestion.companyName,
      industry: suggestion.industry ?? null,
      hqLocation: suggestion.hqLocation ?? null,
      website: suggestion.website ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: companies.id });

  // If company already exists (name collision), look it up
  let companyId: string;
  if (company) {
    companyId = company.id;
  } else {
    const [existing] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(eq(companies.name, suggestion.companyName), isNull(companies.deletedAt)),
      )
      .limit(1);
    if (!existing) return { ok: false, error: "Failed to create or find company" };
    companyId = existing.id;
  }

  // Attach to event
  await db
    .insert(eventCompanies)
    .values({
      eventId,
      companyId,
      status: "prospect",
      priority: "medium",
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .onConflictDoNothing({
      target: [eventCompanies.eventId, eventCompanies.companyId],
    });

  // Mark suggestion accepted
  await db
    .update(companySuggestions)
    .set({
      status: "accepted",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      createdCompanyId: companyId,
    })
    .where(eq(companySuggestions.id, suggestionId));

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "agent.suggestion_accept",
    entityType: "companySuggestion",
    entityId: suggestionId,
    changes: { companyId, companyName: suggestion.companyName },
  });

  revalidatePath(`/admin/events/${eventId}/agents`);
  revalidatePath("/companies");
  return { ok: true, companyId };
}

// ---------------------------------------------------------------------------
// Dismiss a company suggestion
// ---------------------------------------------------------------------------

const dismissSchema = z.object({
  suggestionId: z.uuid(),
  eventId: z.uuid(),
});

export async function dismissCompanySuggestion(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const parsed = dismissSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { suggestionId, eventId } = parsed.data;

  await db
    .update(companySuggestions)
    .set({
      status: "dismissed",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    })
    .where(
      and(
        eq(companySuggestions.id, suggestionId),
        eq(companySuggestions.status, "pending"),
      ),
    );

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "agent.suggestion_dismiss",
    entityType: "companySuggestion",
    entityId: suggestionId,
    changes: {},
  });

  revalidatePath(`/admin/events/${eventId}/agents`);
  return { ok: true };
}
