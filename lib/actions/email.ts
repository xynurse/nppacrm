"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateText } from "ai";
import {
  aiConfigurationStatus,
  resolveModel,
  DEFAULT_MODEL_ID,
} from "@/lib/ai/gateway";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  companies,
  contacts,
  eventCompanies,
  prospectuses,
} from "@/lib/db/schema";
import { logInteraction } from "@/lib/actions/interactions";
import { changeStatus } from "@/lib/pipeline/change-status";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const draftSchema = z.object({ eventCompanyId: z.uuid() });

export type DraftEmailResult = {
  subject: string;
  body: string;
  toEmail: string | null;
  toName: string | null;
  contactId: string | null;
};

/**
 * Generate a professional outreach email for a prospect company.
 * Uses the event prospectus as system context (cached) and the company
 * profile + existing CRM notes as the user prompt.
 */
export async function draftOutreachEmail(
  raw: unknown,
): Promise<ActionResult<DraftEmailResult>> {
  const session = await requireSession();
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const ai = aiConfigurationStatus();
  if (!ai.ok) {
    return {
      ok: false,
      error: "AI is not configured. Ask your admin to set up the AI Gateway.",
    };
  }

  // ── Load the prospect record ──────────────────────────────────────────────
  const [ec] = await db
    .select()
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.eventCompanyId))
    .limit(1);
  if (!ec) return { ok: false, error: "Prospect not found" };

  // ── Company profile ───────────────────────────────────────────────────────
  const [company] = await db
    .select({
      name: companies.name,
      website: companies.website,
      industry: companies.industry,
      hqLocation: companies.hqLocation,
      shortDescription: companies.shortDescription,
    })
    .from(companies)
    .where(eq(companies.id, ec.companyId))
    .limit(1);
  if (!company) return { ok: false, error: "Company record missing" };

  // ── Primary contact for personalisation ──────────────────────────────────
  // Prefer the flagged primary; fall back to any contact with an email so
  // "Open in mail" still has a To: address.
  let primaryContact =
    (
      await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          fullName: contacts.fullName,
          title: contacts.title,
          email: contacts.email,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.companyId, ec.companyId),
            eq(contacts.isPrimary, true),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1)
    )[0] ?? null;

  if (!primaryContact) {
    primaryContact =
      (
        await db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            fullName: contacts.fullName,
            title: contacts.title,
            email: contacts.email,
          })
          .from(contacts)
          .where(
            and(eq(contacts.companyId, ec.companyId), isNull(contacts.deletedAt)),
          )
          .limit(1)
      )[0] ?? null;
  }

  // ── Event prospectus ──────────────────────────────────────────────────────
  const [prospectus] = await db
    .select({
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
        "No prospectus on file for this event. Upload one under Admin → Events → Prospectus, then retry.",
    };
  }

  // ── Build prompts ─────────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(prospectus.textContent);
  const userPrompt = buildUserPrompt({
    company: {
      name: company.name,
      website: company.website,
      industry: company.industry,
      hqLocation: company.hqLocation,
      description: company.shortDescription,
    },
    ec,
    primaryContact: primaryContact ?? null,
  });

  // ── Call the model ────────────────────────────────────────────────────────
  try {
    const model = await resolveModel(DEFAULT_MODEL_ID);
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 800,
      providerOptions: {
        anthropic: {
          cacheControl: { type: "ephemeral" },
        },
      },
    });

    // The model returns "SUBJECT: ...\n\nBODY:\n..." — parse it out.
    const { subject, body } = parseEmailResponse(text, company.name);

    await recordAudit({
      userId: session.user.id,
      eventId: ec.eventId,
      action: "email.draft",
      entityType: "eventCompany",
      entityId: parsed.data.eventCompanyId,
      changes: { companyName: company.name },
    });

    return {
      ok: true,
      subject,
      body,
      toEmail: primaryContact?.email ?? null,
      toName: primaryContact?.fullName ?? null,
      contactId: primaryContact?.id ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email draft failed";
    return { ok: false, error: message };
  }
}

const markSentSchema = z.object({
  eventCompanyId: z.uuid(),
  subject: z.string().trim().max(280).nullable().optional(),
  body: z.string().trim().max(20000).nullable().optional(),
  contactId: z.uuid().nullable().optional(),
});

/**
 * Log the drafted outreach as a sent email interaction. When the prospect is
 * still in `prospect`, advance them to `contacted` (same path as the pipeline).
 */
export async function markEmailSent(
  raw: unknown,
): Promise<
  ActionResult<{ interactionId: string; statusAdvanced: boolean }>
> {
  const session = await requireSession();
  const parsed = markSentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [ec] = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      status: eventCompanies.status,
      deletedAt: eventCompanies.deletedAt,
    })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.eventCompanyId))
    .limit(1);
  if (!ec || ec.deletedAt) return { ok: false, error: "Prospect not found" };

  const logged = await logInteraction({
    eventCompanyId: parsed.data.eventCompanyId,
    type: "email",
    subject: parsed.data.subject ?? null,
    body: parsed.data.body ?? null,
    contactId: parsed.data.contactId ?? null,
  });
  if (!logged.ok || !logged.data?.id) {
    return { ok: false, error: logged.ok ? "Failed to log email" : logged.error };
  }

  let statusAdvanced = false;
  if (ec.status === "prospect") {
    const moved = await changeStatus({
      id: parsed.data.eventCompanyId,
      to: "contacted",
      actor: {
        id: session.user.id,
        name: session.user.name ?? null,
      },
      source: "email.mark_sent",
    });
    statusAdvanced = moved.ok;
  }

  await recordAudit({
    userId: session.user.id,
    eventId: ec.eventId,
    action: "email.mark_sent",
    entityType: "eventCompany",
    entityId: parsed.data.eventCompanyId,
    changes: {
      interactionId: logged.data.id,
      statusAdvanced,
      subject: parsed.data.subject ?? null,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return {
    ok: true,
    interactionId: logged.data.id,
    statusAdvanced,
  };
}

// ── Prompt helpers ────────────────────────────────────────────────────────────

function buildSystemPrompt(prospectusText: string): string {
  return `You are a sponsorship development professional writing outreach emails on behalf of a healthcare conference team. Your emails are read by senior executives and marketing directors at healthcare and life-sciences companies.

CONFERENCE PROSPECTUS (your primary source of facts):
"""
${prospectusText.slice(0, 55_000)}
"""

Rules for every email you write:
- Open with a direct, specific observation about the recipient company — not a generic pleasantry
- Never use "I hope this email finds you well", "reach out", "circle back", "touch base", "leverage", or "synergy"
- Never describe your conference as "amazing", "unique", "world-class", or "once-in-a-lifetime"
- Ground every claim about the conference in the prospectus (audience size, specialties, attendance numbers)
- One clear ask per email — a brief call, not a signed contract
- Keep it under 200 words in the body (not counting subject line)
- Write in plain prose — no bullet points, no headers inside the email body
- Sound like a real person wrote it, not a template`;
}

function buildUserPrompt(opts: {
  company: {
    name: string;
    website: string | null;
    industry: string | null;
    hqLocation: string | null;
    description: string | null;
  };
  ec: {
    whyTheyShouldAttend: string | null;
    keyTalkingPoints: string | null;
    emailAngle: string | null;
    sponsorshipHook: string | null;
    companyContext: string | null;
    relationshipNotes: string | null;
  };
  primaryContact: {
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    title: string | null;
    email: string | null;
  } | null;
}): string {
  const { company, ec, primaryContact } = opts;

  const contactBlock = primaryContact
    ? `Primary contact: ${primaryContact.fullName}${primaryContact.title ? `, ${primaryContact.title}` : ""}`
    : "Primary contact: (unknown — address generically as the marketing/sponsorship team)";

  const crmNotes = [
    ec.emailAngle ? `Email angle from CRM: ${ec.emailAngle}` : null,
    ec.whyTheyShouldAttend
      ? `Why they should attend: ${ec.whyTheyShouldAttend}`
      : null,
    ec.sponsorshipHook ? `Sponsorship hook: ${ec.sponsorshipHook}` : null,
    ec.keyTalkingPoints ? `Key talking points: ${ec.keyTalkingPoints}` : null,
    ec.companyContext ? `Company context: ${ec.companyContext}` : null,
    ec.relationshipNotes ? `Relationship notes: ${ec.relationshipNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Write a cold outreach email for this prospect.

Company: ${company.name}
Website: ${company.website ?? "(unknown)"}
Industry: ${company.industry ?? "(unknown)"}
HQ: ${company.hqLocation ?? "(unknown)"}
${company.description ? `Description: ${company.description}` : ""}

${contactBlock}

${crmNotes ? `CRM notes to weave in (use these, don't quote them verbatim):\n${crmNotes}` : "No additional CRM notes — rely on the prospectus and the company's public profile."}

Return your response in exactly this format (no extra text before or after):
SUBJECT: [subject line here]

BODY:
[email body here — plain prose, no bullets, no markdown]`;
}

function parseEmailResponse(
  raw: string,
  fallbackCompany: string,
): { subject: string; body: string } {
  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)/im);
  const bodyMatch = raw.match(/^BODY:\s*\n([\s\S]+)/im);

  const subject =
    subjectMatch?.[1]?.trim() ??
    `Sponsorship opportunity — ${fallbackCompany}`;
  const body = bodyMatch?.[1]?.trim() ?? raw.trim();

  return { subject, body };
}
