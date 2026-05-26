"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { del } from "@vercel/blob";
import {
  DEFAULT_MODEL_ID,
  aiConfigurationStatus,
  calculateCostUsd,
  runEnrichment,
} from "@/lib/ai/gateway";
import { extractPdfText, estimateTokens } from "@/lib/ai/pdf";
import { formatHitsForPrompt, valyuSearch } from "@/lib/ai/search";
import { checkSpendCap } from "@/lib/ai/spend";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  enrichmentJobs,
  enrichmentSuggestions,
  eventCompanies,
  prospectuses,
} from "@/lib/db/schema";
import { env } from "@/lib/env";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const OUTREACH_FIELDS = {
  whyTheyShouldAttend: "why_they_should_attend",
  keyTalkingPoints: "key_talking_points",
  emailAngle: "email_angle",
  sponsorshipHook: "sponsorship_hook",
} as const;

type OutreachField = keyof typeof OUTREACH_FIELDS;

// ---------------------------------------------------------------------------
// Prospectus upload + delete
// ---------------------------------------------------------------------------

const uploadProspectusSchema = z.object({
  eventId: z.uuid(),
  blobUrl: z.url(),
  blobPathname: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap
});

export async function uploadProspectus(
  raw: unknown,
): Promise<ActionResult<{ id: string; tokenEstimate: number }>> {
  const session = await requireAdmin();
  const parsed = uploadProspectusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { eventId, blobUrl, blobPathname, fileName, fileSize } = parsed.data;

  // Pull the file back from Blob to extract text.
  let text = "";
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) {
      return { ok: false, error: `Couldn't fetch uploaded blob (${res.status})` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const parsedPdf = await extractPdfText(buf);
    text = parsedPdf.text.trim();
    if (text.length === 0) {
      return {
        ok: false,
        error:
          "PDF parsed but contained no extractable text (image-only scan?).",
      };
    }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? `PDF parse failed: ${err.message}` : "PDF parse failed",
    };
  }

  const tokenEstimate = estimateTokens(text);

  // Soft-delete any existing active prospectus for this event so the partial
  // unique index lets us insert a fresh one.
  await db
    .update(prospectuses)
    .set({ deletedAt: new Date() })
    .where(
      and(eq(prospectuses.eventId, eventId), isNull(prospectuses.deletedAt)),
    );

  const [created] = await db
    .insert(prospectuses)
    .values({
      eventId,
      blobUrl,
      blobPathname,
      fileName,
      fileSize,
      textContent: text,
      textTokenEstimate: tokenEstimate,
      uploadedBy: session.user.id,
    })
    .returning({ id: prospectuses.id });

  if (!created) return { ok: false, error: "Failed to save prospectus" };

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "prospectus.upload",
    entityType: "prospectus",
    entityId: created.id,
    changes: { fileName, fileSize, tokenEstimate },
  });

  revalidatePath(`/admin/events/${eventId}/prospectus`);
  return { ok: true, id: created.id, tokenEstimate };
}

const deleteProspectusSchema = z.object({ id: z.uuid() });

export async function deleteProspectus(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = deleteProspectusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({
      id: prospectuses.id,
      eventId: prospectuses.eventId,
      blobUrl: prospectuses.blobUrl,
      fileName: prospectuses.fileName,
      deletedAt: prospectuses.deletedAt,
    })
    .from(prospectuses)
    .where(eq(prospectuses.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };
  if (existing.deletedAt) return { ok: false, error: "Already deleted" };

  await db
    .update(prospectuses)
    .set({ deletedAt: new Date() })
    .where(eq(prospectuses.id, parsed.data.id));

  // Best-effort blob cleanup. If it fails, the soft-delete still stands.
  if (env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(existing.blobUrl, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // swallow — we don't want blob errors to make the action fail
    }
  }

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "prospectus.delete",
    entityType: "prospectus",
    entityId: existing.id,
    changes: { fileName: existing.fileName },
  });

  revalidatePath(`/admin/events/${existing.eventId}/prospectus`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Single-prospect enrichment
// ---------------------------------------------------------------------------

const enrichSingleSchema = z.object({ eventCompanyId: z.uuid() });

export async function enrichSingle(
  raw: unknown,
): Promise<ActionResult<{ jobId: string; suggestionCount: number }>> {
  const session = await requireSession();
  const parsed = enrichSingleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const ai = aiConfigurationStatus();
  if (!ai.ok) {
    return { ok: false, error: ai.reason ?? "AI not configured" };
  }

  // Daily spend cap pre-flight.
  const cap = await checkSpendCap();
  if (!cap.ok) {
    return {
      ok: false,
      error: `Daily AI spend cap reached ($${cap.spentUsd.toFixed(2)} / $${cap.capUsd.toFixed(2)}). Try again tomorrow or raise AI_DAILY_SPEND_CAP_USD.`,
    };
  }

  // Load the prospect record + active prospectus.
  const [ec] = await db
    .select()
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.eventCompanyId))
    .limit(1);
  if (!ec) return { ok: false, error: "Prospect not found" };

  const [prospectus] = await db
    .select({
      id: prospectuses.id,
      textContent: prospectuses.textContent,
      fileName: prospectuses.fileName,
    })
    .from(prospectuses)
    .where(
      and(
        eq(prospectuses.eventId, ec.eventId),
        isNull(prospectuses.deletedAt),
      ),
    )
    .limit(1);
  if (!prospectus) {
    return {
      ok: false,
      error:
        "Upload a prospectus PDF for this event first (Admin → Events → Prospectus).",
    };
  }

  // Resolve company name for the search query.
  const companyRow = await db.query.companies?.findFirst?.({
    where: (t, { eq: eqOp }) => eqOp(t.id, ec.companyId),
  });
  // Fall back to a plain select if the relational API isn't wired.
  let companyName: string | null = null;
  let companyWebsite: string | null = null;
  let companyIndustry: string | null = null;
  if (companyRow) {
    companyName = (companyRow as { name?: string }).name ?? null;
    companyWebsite = (companyRow as { website?: string | null }).website ?? null;
    companyIndustry =
      (companyRow as { industry?: string | null }).industry ?? null;
  } else {
    const { companies } = await import("@/lib/db/schema");
    const [c] = await db
      .select({
        name: companies.name,
        website: companies.website,
        industry: companies.industry,
      })
      .from(companies)
      .where(eq(companies.id, ec.companyId))
      .limit(1);
    if (c) {
      companyName = c.name;
      companyWebsite = c.website;
      companyIndustry = c.industry;
    }
  }
  if (!companyName) return { ok: false, error: "Company record missing" };

  // Insert the job row in running state so spend cap accounting works mid-flight.
  const [job] = await db
    .insert(enrichmentJobs)
    .values({
      eventCompanyId: parsed.data.eventCompanyId,
      status: "running",
      model: DEFAULT_MODEL_ID,
      startedAt: new Date(),
      requestedBy: session.user.id,
    })
    .returning({ id: enrichmentJobs.id });
  if (!job) return { ok: false, error: "Failed to start job" };

  try {
    // Web search for grounding (best-effort).
    const searchQuery = [
      companyName,
      companyIndustry ? `(${companyIndustry})` : null,
      "sponsorship healthcare conference",
    ]
      .filter(Boolean)
      .join(" ");
    const search = await valyuSearch({ query: searchQuery, maxResults: 5 });

    // Compose the prompt.
    const systemContext = buildSystemContext({
      prospectusText: prospectus.textContent,
    });

    const userPrompt = buildUserPrompt({
      companyName,
      companyWebsite,
      companyIndustry,
      ecNotes: {
        whyTheyShouldAttend: ec.whyTheyShouldAttend,
        keyTalkingPoints: ec.keyTalkingPoints,
        emailAngle: ec.emailAngle,
        sponsorshipHook: ec.sponsorshipHook,
        companyContext: ec.companyContext,
        relationshipNotes: ec.relationshipNotes,
      },
      searchContext: formatHitsForPrompt(search.hits),
    });

    const { result, usage, model } = await runEnrichment({
      systemContext,
      userPrompt,
    });

    const cost = calculateCostUsd({
      model,
      promptTokens: usage.promptTokens,
      cachedPromptTokens: usage.cachedPromptTokens,
      completionTokens: usage.completionTokens,
    });

    await db
      .update(enrichmentJobs)
      .set({
        status: "succeeded",
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cachedPromptTokens: usage.cachedPromptTokens,
        searchCalls: search.callCount,
        costUsd: cost.toFixed(4),
        finishedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, job.id));

    if (result.suggestions.length > 0) {
      await db.insert(enrichmentSuggestions).values(
        result.suggestions.map((s) => ({
          jobId: job.id,
          eventCompanyId: parsed.data.eventCompanyId,
          field: s.field,
          suggestion: s.suggestion,
          confidence: s.confidence.toFixed(2),
          sourceUrls: s.sourceUrls,
          reasoning: s.reasoning,
        })),
      );
    }

    await recordAudit({
      userId: session.user.id,
      eventId: ec.eventId,
      action: "enrichment.run",
      entityType: "eventCompany",
      entityId: parsed.data.eventCompanyId,
      changes: {
        jobId: job.id,
        suggestionCount: result.suggestions.length,
        model,
        cost,
      },
    });

    revalidatePath("/companies");
    return {
      ok: true,
      jobId: job.id,
      suggestionCount: result.suggestions.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    await db
      .update(enrichmentJobs)
      .set({
        status: "failed",
        error: message.slice(0, 1000),
        finishedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, job.id));
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Accept / reject a single suggestion
// ---------------------------------------------------------------------------

const reviewSchema = z.object({ id: z.uuid() });

export async function acceptSuggestion(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [suggestion] = await db
    .select()
    .from(enrichmentSuggestions)
    .where(eq(enrichmentSuggestions.id, parsed.data.id))
    .limit(1);
  if (!suggestion) return { ok: false, error: "Suggestion not found" };
  if (suggestion.status !== "pending") {
    return { ok: false, error: `Already ${suggestion.status}` };
  }

  if (!(suggestion.field in OUTREACH_FIELDS)) {
    return { ok: false, error: `Unknown field: ${suggestion.field}` };
  }
  const fieldKey = suggestion.field as OutreachField;

  // Whitelisted field write on event_companies — only the four outreach fields.
  const now = new Date();
  await db
    .update(eventCompanies)
    .set({
      [fieldKey]: suggestion.suggestion,
      updatedAt: now,
      updatedBy: session.user.id,
    } as Record<string, unknown>)
    .where(eq(eventCompanies.id, suggestion.eventCompanyId));

  await db
    .update(enrichmentSuggestions)
    .set({
      status: "accepted",
      reviewedBy: session.user.id,
      reviewedAt: now,
    })
    .where(eq(enrichmentSuggestions.id, suggestion.id));

  await recordAudit({
    userId: session.user.id,
    action: "enrichment.accept",
    entityType: "eventCompany",
    entityId: suggestion.eventCompanyId,
    changes: { field: fieldKey, suggestionId: suggestion.id },
  });

  revalidatePath("/companies");
  return { ok: true };
}

export async function rejectSuggestion(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [suggestion] = await db
    .select({
      id: enrichmentSuggestions.id,
      status: enrichmentSuggestions.status,
      field: enrichmentSuggestions.field,
      eventCompanyId: enrichmentSuggestions.eventCompanyId,
    })
    .from(enrichmentSuggestions)
    .where(eq(enrichmentSuggestions.id, parsed.data.id))
    .limit(1);
  if (!suggestion) return { ok: false, error: "Suggestion not found" };
  if (suggestion.status !== "pending") {
    return { ok: false, error: `Already ${suggestion.status}` };
  }

  await db
    .update(enrichmentSuggestions)
    .set({
      status: "rejected",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(enrichmentSuggestions.id, suggestion.id));

  await recordAudit({
    userId: session.user.id,
    action: "enrichment.reject",
    entityType: "eventCompany",
    entityId: suggestion.eventCompanyId,
    changes: { field: suggestion.field, suggestionId: suggestion.id },
  });

  revalidatePath("/companies");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function buildSystemContext(opts: { prospectusText: string }): string {
  return `You are an outreach assistant for a healthcare conference sponsorship team.
Your job is to draft short, factual, professional outreach copy for a specific
prospect company. Use the conference prospectus below as your primary
grounding. Never invent facts about the company; if you don't know
something, say "based on publicly available info" or leave it out.

CONFERENCE PROSPECTUS (verbatim text extracted from PDF):
"""
${opts.prospectusText.slice(0, 60_000)}
"""

Rules:
- Write 1-3 sentences per field, plain prose, no markdown, no bullet points.
- Avoid superlatives ("amazing", "perfect", "world-class").
- Tie everything back to specifics from the prospectus (audience size,
  benefits, target outcomes).
- If a field cannot be confidently drafted from the available context,
  omit that field from your output rather than making something up.
`;
}

function buildUserPrompt(opts: {
  companyName: string;
  companyWebsite: string | null;
  companyIndustry: string | null;
  ecNotes: Record<string, string | null>;
  searchContext: string;
}): string {
  const existing = Object.entries(opts.ecNotes)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Prospect company:
- Name: ${opts.companyName}
- Website: ${opts.companyWebsite ?? "(unknown)"}
- Industry: ${opts.companyIndustry ?? "(unknown)"}

Existing notes from CRM:
${existing || "(none yet)"}

Web search context (cite the [N] index in sourceUrls when used):
${opts.searchContext}

Draft 1-4 suggestions across these fields, picking only the fields where you
can ground each draft in the prospectus + the company context:

- whyTheyShouldAttend: a paragraph the team can paste into outreach explaining
  why THIS conference is a fit for THIS company.
- keyTalkingPoints: 2-4 sentences of bullet-style points to mention on a call
  (still plain prose, separated by " · ").
- emailAngle: one sentence subject-line-style hook for an opening email.
- sponsorshipHook: one sentence positioning the sponsorship opportunity (tier
  / benefits / why the spend makes sense).
`;
}
