/**
 * Discovery Agent — finds NEW company sponsorship candidates for an event.
 *
 * Flow:
 *  1. Load event context (tiers, existing companies)
 *  2. Run 3 targeted Valyu searches
 *  3. Call Claude Opus with full context → structured candidate list
 *  4. Persist agentRun + companySuggestions rows
 */

import { generateObject } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  calculateCostUsd,
  DEFAULT_MODEL_ID,
  resolveModel,
} from "@/lib/ai/gateway";
import { formatHitsForPrompt, valyuSearch } from "@/lib/ai/search";
import { db } from "@/lib/db";
import {
  agentRuns,
  agentSchedules,
  companies,
  companySuggestions,
  eventCompanies,
  events,
  sponsorshipTiers,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

const candidateSchema = z.object({
  candidates: z
    .array(
      z.object({
        companyName: z
          .string()
          .min(1)
          .max(200)
          .describe("Official company name."),
        industry: z
          .string()
          .max(120)
          .optional()
          .default("")
          .describe("Industry or sector."),
        hqLocation: z
          .string()
          .max(200)
          .optional()
          .default("")
          .describe("City and state / country of headquarters."),
        website: z
          .string()
          .max(300)
          .optional()
          .default("")
          .describe("Company website URL if known."),
        rationale: z
          .string()
          .min(20)
          .max(600)
          .describe(
            "Why this company is a strong sponsorship candidate. Be specific about their relevance to NPs/PAs.",
          ),
        matchScore: z
          .number()
          .min(0)
          .max(1)
          .describe(
            "0–1 confidence score. 1 = near-perfect ICP fit. 0.7+ recommended.",
          ),
        sourceUrls: z
          .array(z.string())
          .max(5)
          .default([])
          .describe("Source URLs from the web research that informed this suggestion."),
      }),
    )
    .min(1)
    .max(10)
    .describe(
      "List of new company candidates. Each must be a real company NOT already in the existing sponsor list.",
    ),
});

export type DiscoveryCandidate = z.infer<
  typeof candidateSchema
>["candidates"][number];

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runDiscovery(opts: {
  eventId: string;
  triggeredBy: string | null;
  modelId?: string;
}): Promise<{ runId: string; count: number }> {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;

  // Create a run record immediately so the UI can reflect "running" state.
  const [run] = await db
    .insert(agentRuns)
    .values({
      eventId: opts.eventId,
      agentType: "discovery",
      status: "running",
      startedAt: new Date(),
      triggeredBy: opts.triggeredBy,
    })
    .returning({ id: agentRuns.id });

  if (!run) throw new Error("Failed to create agent run record");
  const runId = run.id;

  try {
    // -----------------------------------------------------------------------
    // 1. Load event context
    // -----------------------------------------------------------------------
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, opts.eventId))
      .limit(1);
    if (!event) throw new Error("Event not found");

    const tiers = await db
      .select({ name: sponsorshipTiers.name, suggestedAmount: sponsorshipTiers.suggestedAmount })
      .from(sponsorshipTiers)
      .where(eq(sponsorshipTiers.eventId, opts.eventId))
      .orderBy(sponsorshipTiers.displayOrder);

    const existingRows = await db
      .select({ name: companies.name })
      .from(companies)
      .innerJoin(eventCompanies, eq(companies.id, eventCompanies.companyId))
      .where(
        and(
          eq(eventCompanies.eventId, opts.eventId),
          isNull(eventCompanies.deletedAt),
          isNull(companies.deletedAt),
        ),
      );
    const existingNames = new Set(existingRows.map((r) => r.name.toLowerCase()));

    // -----------------------------------------------------------------------
    // 2. Valyu searches — three angles on the same ICP
    // -----------------------------------------------------------------------
    const year = new Date().getFullYear();
    const searchQueries = [
      `nurse practitioner physician assistant conference corporate sponsors medical companies ${year}`,
      `healthcare professional development NP PA education sponsorship medical device pharmaceutical`,
      `${event.name} sponsorship healthcare industry partners`,
    ];

    type SearchHit = { title: string; url: string; content: string };
    let allHits: SearchHit[] = [];
    let searchCalls = 0;
    for (const query of searchQueries) {
      const result = await valyuSearch({ query, maxResults: 4, searchType: "web" });
      allHits = [...allHits, ...result.hits];
      searchCalls += result.callCount;
    }
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    allHits = allHits.filter((h) => {
      if (seenUrls.has(h.url)) return false;
      seenUrls.add(h.url);
      return true;
    });

    // -----------------------------------------------------------------------
    // 3. Build prompts
    // -----------------------------------------------------------------------
    const tierSummary = tiers.length
      ? tiers
          .map((t) =>
            t.suggestedAmount
              ? `${t.name} ($${Number(t.suggestedAmount).toLocaleString()})`
              : t.name,
          )
          .join(", ")
      : "Standard, Premium, Title";

    const existingList = [...existingNames].slice(0, 60).join(", ") || "(none yet)";

    const systemPrompt = `You are a sponsorship research analyst for "${event.name}".

This is a professional development conference for Nurse Practitioners (NPs) and Physician Assistants (PAs) — advanced practice healthcare providers in clinical settings across the US.

Sponsorship tiers: ${tierSummary}

Companies already being prospected — DO NOT suggest these:
${existingList}

Target industries for new candidates:
- Medical devices and equipment
- Pharmaceuticals and biologics
- Healthcare technology and EHR/EMR software
- Medical education and CME providers
- Healthcare staffing and recruiting
- Clinical diagnostics and lab services
- Health insurance and benefits
- Medical publishing and reference tools

Only suggest real, established companies with products or services directly relevant to NP/PA clinical practice. Score honestly — 0.7+ means a genuine ICP match.`;

    const userPrompt = `Based on the web research below, identify 5–8 NEW companies that would be strong sponsorship candidates for ${event.name}.
Each must be a real company NOT in the already-prospecting list. Prioritize companies with clear relevance to NP/PA practice.

${allHits.length > 0 ? formatHitsForPrompt(allHits) : "(no web context — use your knowledge of the healthcare sponsorship landscape)"}

Return structured JSON with specific company names, industries, rationale, and match scores.`;

    // -----------------------------------------------------------------------
    // 4. Claude inference
    // -----------------------------------------------------------------------
    const model = await resolveModel(modelId);
    const { object, usage } = await generateObject({
      model,
      schema: candidateSchema,
      system: systemPrompt,
      prompt: userPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });

    const u = (usage ?? {}) as {
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
    const promptTokens = u.inputTokens ?? u.promptTokens ?? 0;
    const completionTokens = u.outputTokens ?? u.completionTokens ?? 0;
    const cachedPromptTokens = u.cachedInputTokens ?? 0;
    const costUsd = calculateCostUsd({
      model: modelId,
      promptTokens,
      cachedPromptTokens,
      completionTokens,
    });

    // -----------------------------------------------------------------------
    // 5. Filter out any duplicates Claude produced anyway
    // -----------------------------------------------------------------------
    const filtered = object.candidates.filter(
      (c) => !existingNames.has(c.companyName.toLowerCase()),
    );

    // -----------------------------------------------------------------------
    // 6. Persist suggestions
    // -----------------------------------------------------------------------
    if (filtered.length > 0) {
      await db.insert(companySuggestions).values(
        filtered.map((c) => ({
          agentRunId: runId,
          eventId: opts.eventId,
          companyName: c.companyName,
          industry: c.industry || null,
          hqLocation: c.hqLocation || null,
          website: c.website || null,
          rationale: c.rationale,
          matchScore: String(c.matchScore),
          sourceUrls: c.sourceUrls.filter(Boolean),
          status: "pending" as const,
        })),
      );
    }

    // -----------------------------------------------------------------------
    // 7. Update run record
    // -----------------------------------------------------------------------
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        suggestionCount: filtered.length,
        promptTokens,
        completionTokens,
        cachedPromptTokens,
        searchCalls,
        costUsd: String(costUsd),
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));

    // Upsert agent schedule so last-run shows in the UI.
    await db
      .insert(agentSchedules)
      .values({
        eventId: opts.eventId,
        agentType: "discovery",
        enabled: false,
        lastRunAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [agentSchedules.eventId, agentSchedules.agentType],
        set: { lastRunAt: new Date(), updatedAt: new Date() },
      });

    return { runId, count: filtered.length };
  } catch (error) {
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));
    throw error;
  }
}
