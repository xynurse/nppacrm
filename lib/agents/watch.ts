/**
 * Watch Agent — monitors EXISTING prospects for actionable business signals.
 *
 * For each active prospect it:
 *  1. Runs a targeted Valyu search for recent news / funding / leadership changes
 *  2. Asks Claude Haiku to assess whether the signal is relevant to sponsorship outreach
 *  3. If a real signal is found, creates a follow-up task on the company so the
 *     team is notified in their normal workflow
 *
 * Designed to be cheap: Haiku is used (not Sonnet/Opus), up to MAX_COMPANIES
 * per run, and companies contacted in the last 7 days are skipped.
 */

import { generateObject } from "ai";
import { and, asc, eq, isNull, lt, ne, or } from "drizzle-orm";
import { z } from "zod";
import {
  calculateCostUsd,
  resolveModel,
} from "@/lib/ai/gateway";
import { formatHitsForPrompt, valyuSearch } from "@/lib/ai/search";
import { db } from "@/lib/db";
import {
  agentRuns,
  agentSchedules,
  companies,
  eventCompanies,
  events,
  tasks,
} from "@/lib/db/schema";

const WATCH_MODEL = "anthropic/claude-haiku-4-5";
const MAX_COMPANIES = 10; // cap per run to control costs
const SKIP_RECENT_DAYS = 7; // skip companies contacted this recently

// ---------------------------------------------------------------------------
// Signal assessment schema
// ---------------------------------------------------------------------------

const signalSchema = z.object({
  hasSignal: z
    .boolean()
    .describe(
      "True if there is a recent, specific business signal that makes this a good time to reach out.",
    ),
  signalType: z
    .enum(["funding", "leadership", "product_launch", "partnership", "other", "none"])
    .describe("Category of the signal, or 'none' if hasSignal is false."),
  summary: z
    .string()
    .max(300)
    .describe(
      "1-2 sentences describing the signal. Empty string if hasSignal is false.",
    ),
  outreachAngle: z
    .string()
    .max(400)
    .describe(
      "1 sentence on how the team can tie this signal into a sponsorship conversation. Empty if hasSignal is false.",
    ),
});

type SignalResult = z.infer<typeof signalSchema>;

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runWatch(opts: {
  eventId: string;
  triggeredBy: string | null;
  maxCompanies?: number;
}): Promise<{ runId: string; count: number; totalCostUsd: number }> {
  const maxCompanies = opts.maxCompanies ?? MAX_COMPANIES;

  // Create run record immediately so the UI reflects "running" state.
  const [run] = await db
    .insert(agentRuns)
    .values({
      eventId: opts.eventId,
      agentType: "watch",
      status: "running",
      startedAt: new Date(),
      triggeredBy: opts.triggeredBy,
    })
    .returning({ id: agentRuns.id });

  if (!run) throw new Error("Failed to create agent run record");
  const runId = run.id;

  let tasksCreated = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCachedTokens = 0;
  let totalSearchCalls = 0;
  let totalCostUsd = 0;

  try {
    // ── Load event ──────────────────────────────────────────────────────────
    const [event] = await db
      .select({ id: events.id, name: events.name })
      .from(events)
      .where(eq(events.id, opts.eventId))
      .limit(1);
    if (!event) throw new Error("Event not found");

    // ── Load active prospects ────────────────────────────────────────────────
    // Skip confirmed, declined, past_sponsor, and recently-contacted ones.
    const recentCutoff = new Date(Date.now() - SKIP_RECENT_DAYS * 86_400_000);

    const prospects = await db
      .select({
        id: eventCompanies.id,
        companyId: eventCompanies.companyId,
        companyName: companies.name,
        companyIndustry: companies.industry,
        ownerId: eventCompanies.ownerId,
        lastContactedAt: eventCompanies.lastContactedAt,
        emailAngle: eventCompanies.emailAngle,
      })
      .from(eventCompanies)
      .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
      .where(
        and(
          eq(eventCompanies.eventId, opts.eventId),
          isNull(eventCompanies.deletedAt),
          isNull(companies.deletedAt),
          // Not in terminal statuses
          ne(eventCompanies.status, "confirmed"),
          ne(eventCompanies.status, "declined"),
          ne(eventCompanies.status, "past_sponsor"),
          // Skip anyone contacted within the last SKIP_RECENT_DAYS days
          or(
            isNull(eventCompanies.lastContactedAt),
            lt(eventCompanies.lastContactedAt, recentCutoff),
          ),
        ),
      )
      // Prioritise the most stale first (longest since contact)
      .orderBy(asc(eventCompanies.lastContactedAt))
      .limit(maxCompanies);

    const model = await resolveModel(WATCH_MODEL);
    const year = new Date().getFullYear();

    for (const prospect of prospects) {
      try {
        // ── Valyu search ──────────────────────────────────────────────────
        const query = [
          prospect.companyName,
          prospect.companyIndustry ? `(${prospect.companyIndustry})` : "",
          `funding leadership news announcement ${year}`,
        ]
          .filter(Boolean)
          .join(" ");

        const search = await valyuSearch({
          query,
          maxResults: 3,
          searchType: "web",
        });
        totalSearchCalls += search.callCount;

        if (search.hits.length === 0) continue;

        // ── Signal assessment ────────────────────────────────────────────
        const systemPrompt = buildWatchSystemPrompt(event.name);
        const userPrompt = buildWatchUserPrompt({
          companyName: prospect.companyName,
          companyIndustry: prospect.companyIndustry,
          existingEmailAngle: prospect.emailAngle,
          searchContext: formatHitsForPrompt(search.hits),
        });

        const { object, usage } = await generateObject({
          model,
          schema: signalSchema,
          system: systemPrompt,
          prompt: userPrompt,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        });

        const u = usage as {
          inputTokens?: number;
          outputTokens?: number;
          cachedInputTokens?: number;
          promptTokens?: number;
          completionTokens?: number;
        };
        const prompt = u.inputTokens ?? u.promptTokens ?? 0;
        const completion = u.outputTokens ?? u.completionTokens ?? 0;
        const cached = u.cachedInputTokens ?? 0;
        totalPromptTokens += prompt;
        totalCompletionTokens += completion;
        totalCachedTokens += cached;

        const companyCost = calculateCostUsd({
          model: WATCH_MODEL,
          promptTokens: prompt,
          cachedPromptTokens: cached,
          completionTokens: completion,
        });
        totalCostUsd += companyCost;

        // ── Create task if signal found ──────────────────────────────────
        if (object.hasSignal && object.summary) {
          const signal = object as SignalResult;
          const taskTitle = `📡 Watch signal: ${signal.signalType.replace("_", " ")} — ${prospect.companyName}`;
          const taskDescription = [
            signal.summary,
            signal.outreachAngle
              ? `\nOutreach angle: ${signal.outreachAngle}`
              : "",
            `\nSource: automated watch agent run ${new Date().toLocaleDateString()}`,
          ]
            .filter(Boolean)
            .join("");

          // Due in 3 days — enough urgency without being immediate noise
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);
          const dueDateStr = dueDate.toISOString().split("T")[0];

          await db.insert(tasks).values({
            eventId: opts.eventId,
            eventCompanyId: prospect.id,
            title: taskTitle,
            description: taskDescription,
            dueDate: dueDateStr,
            priority: signal.signalType === "funding" || signal.signalType === "leadership"
              ? "high"
              : "medium",
            assignedTo: prospect.ownerId ?? opts.triggeredBy,
            createdBy: opts.triggeredBy,
          });

          tasksCreated++;
        }
      } catch {
        // Per-company errors shouldn't abort the whole run
        continue;
      }
    }

    // ── Update run record ────────────────────────────────────────────────────
    await db
      .update(agentRuns)
      .set({
        status: "completed",
        suggestionCount: tasksCreated,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        cachedPromptTokens: totalCachedTokens,
        searchCalls: totalSearchCalls,
        costUsd: String(totalCostUsd.toFixed(4)),
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));

    // Upsert agent schedule lastRunAt
    await db
      .insert(agentSchedules)
      .values({
        eventId: opts.eventId,
        agentType: "watch",
        enabled: false,
        lastRunAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [agentSchedules.eventId, agentSchedules.agentType],
        set: { lastRunAt: new Date(), updatedAt: new Date() },
      });

    return { runId, count: tasksCreated, totalCostUsd };
  } catch (error) {
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
        costUsd: String(totalCostUsd.toFixed(4)),
      })
      .where(eq(agentRuns.id, runId));
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function buildWatchSystemPrompt(eventName: string): string {
  return `You are a business intelligence analyst helping a healthcare conference sponsorship team.

Your job: given web search results about a prospect company, determine whether there is a RECENT, SPECIFIC, actionable business signal that the team should know about before reaching out for sponsorship of "${eventName}".

What counts as a meaningful signal:
- New funding round (Series A, B, C, IPO, etc.)
- Executive leadership change (new CMO, VP Marketing, Chief Medical Officer)
- Major product launch or FDA approval relevant to NPs/PAs
- Acquisition or merger
- Public commitment to NP/PA or advanced practice education

What does NOT count:
- Generic press releases older than 6 months
- Routine earnings reports
- Unrelated industry news
- Rumour or speculation

Be conservative — only set hasSignal: true if the signal is specific, recent, and genuinely relevant to sponsorship outreach.`;
}

function buildWatchUserPrompt(opts: {
  companyName: string;
  companyIndustry: string | null;
  existingEmailAngle: string | null;
  searchContext: string;
}): string {
  return `Company: ${opts.companyName}${opts.companyIndustry ? ` (${opts.companyIndustry})` : ""}
${opts.existingEmailAngle ? `Current email angle on file: ${opts.existingEmailAngle}` : ""}

Web search results:
${opts.searchContext}

Assess: is there a meaningful, recent business signal here that warrants a timely outreach? If yes, summarise it and suggest one outreach angle that ties the signal to sponsorship of our conference.`;
}
