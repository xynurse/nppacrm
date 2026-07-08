import { generateObject } from "ai";
import { z } from "zod";
import {
  INTERACTION_TYPE_VALUES,
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
} from "@/lib/db/schema";
import { DEFAULT_MODEL_ID, resolveModel } from "@/lib/ai/gateway";

/**
 * Natural-language "AI quick update" — parses an informal outreach recap into
 * a set of *proposed*, whitelisted CRM operations per matched company. Nothing
 * here writes to the database; the model only proposes. Writes happen later in
 * `lib/actions/nl-update.ts#applyNlUpdate`, through the existing server actions,
 * and only after the user approves each item.
 *
 * Mirrors the guardrails of the `/sync-outreach` Claude Code skill:
 *  - never propose deletes
 *  - never write amount / tier (confirmed is routed to the app's confirm modal)
 *  - flag unknown company mentions as `unmatched` instead of guessing
 *  - never move a status backwards silently (the model is told to flag it in
 *    the op reasoning; the reviewer sees the from → to on the card)
 */

// A flat op shape (rather than a discriminated union) keeps the JSON schema the
// model must satisfy simple and robust across providers. Per-kind required
// fields are validated again server-side in `applyNlUpdate`.
export const nlOpSchema = z.object({
  kind: z
    .enum([
      "set_status",
      "log_interaction",
      "bump_last_contacted",
      "set_next_action_at",
      "create_task",
    ])
    .describe("Which whitelisted operation to propose."),
  // set_status
  status: z.enum(PROSPECT_STATUS_VALUES).nullable().optional(),
  // log_interaction
  interactionType: z.enum(INTERACTION_TYPE_VALUES).nullable().optional(),
  subject: z.string().max(280).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  // dates — always ISO calendar dates (YYYY-MM-DD)
  occurredAt: z
    .string()
    .nullable()
    .optional()
    .describe("YYYY-MM-DD when the interaction happened / last-contact date."),
  date: z
    .string()
    .nullable()
    .optional()
    .describe("YYYY-MM-DD for set_next_action_at."),
  // create_task
  title: z.string().max(280).nullable().optional(),
  dueDate: z.string().nullable().optional().describe("YYYY-MM-DD or null."),
  priority: z.enum(PROSPECT_PRIORITY_VALUES).nullable().optional(),
  reasoning: z
    .string()
    .max(400)
    .nullable()
    .optional()
    .describe("One short sentence: why this op, and flag status regressions."),
});

export type NlOp = z.infer<typeof nlOpSchema>;

export const nlMatchSchema = z.object({
  companyId: z
    .string()
    .describe("MUST be one of the ids from the prospect list, copied exactly."),
  companyName: z.string().describe("The prospect's display name for the card."),
  ops: z.array(nlOpSchema).min(1),
});

export type NlMatch = z.infer<typeof nlMatchSchema>;

export const nlUpdateSchema = z.object({
  matches: z.array(nlMatchSchema),
  unmatched: z
    .array(z.string())
    .describe("Company mentions that did NOT confidently map to a prospect."),
});

export type NlUpdateResult = z.infer<typeof nlUpdateSchema>;

export type NlProspect = {
  id: string;
  name: string;
  status: string;
  lastContactedAt: Date | null;
};

const SYSTEM_PROMPT = `You convert an informal outreach recap into structured CRM updates for a
healthcare-conference sponsorship team. You ONLY propose changes — a human reviews and
approves every one before anything is written. Be conservative: it is far better to
propose too little than to invent activity that did not happen.

Allowed operations (nothing else is permitted):
- set_status: move a prospect along the pipeline. Enum, in order:
  prospect → contacted → engaged → proposal_sent → negotiating → committed → confirmed,
  plus declined / past_sponsor. Only propose a status change when the text clearly
  implies one. NEVER move a status backwards without saying so in "reasoning".
- log_interaction: record an actual touch. interactionType ∈ email|call|meeting|note|linkedin|other.
  subject = one-line summary; body = the relevant excerpt of the user's text;
  occurredAt = the date it happened (resolve "yesterday"/"last week" against TODAY;
  only default to today if the text says so).
- bump_last_contacted: set occurredAt when a real outbound/inbound touch occurred but you
  are not also logging a full interaction. If you log_interaction for a real touch, you do
  NOT also need bump_last_contacted — logging already bumps last-contact.
- set_next_action_at: date = the agreed next step's date.
- create_task: only when the user asks for a follow-up or the text names a concrete next
  step with a date. title required; dueDate = YYYY-MM-DD or null; priority optional.

Hard rules:
- Match company mentions against the provided prospect list (case-insensitive, common
  abbreviations — "BSC" → "Boston Scientific"). Copy the id EXACTLY. If a mention is
  ambiguous or absent from the list, put the raw mention in "unmatched" — do NOT guess,
  and do NOT invent a companyId.
- NEVER create companies, NEVER delete anything, NEVER write sponsorship amount or tier.
- "confirmed" needs an amount + tier that only the app's confirm modal can capture. If the
  text says a company confirmed/signed, you MAY propose set_status = confirmed, but note in
  "reasoning" that the user must finalize amount + tier in the confirm modal.
- All dates are calendar dates in YYYY-MM-DD.
- If nothing actionable is present for a company, do not include it.`;

function formatProspectList(prospects: NlProspect[]): string {
  return prospects
    .map((p) => {
      const last = p.lastContactedAt
        ? p.lastContactedAt.toISOString().slice(0, 10)
        : "never";
      return `- id=${p.id} | name=${p.name} | status=${p.status} | last_contact=${last}`;
    })
    .join("\n");
}

export async function runNlUpdate(opts: {
  prospects: NlProspect[];
  userText: string;
  todayIso: string;
  modelId?: string;
}): Promise<{
  result: NlUpdateResult;
  usage: {
    promptTokens: number;
    cachedPromptTokens: number;
    completionTokens: number;
  };
  model: string;
}> {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const model = await resolveModel(modelId);

  const userPrompt = `TODAY: ${opts.todayIso}

PROSPECT LIST (the only companies you may match against):
${formatProspectList(opts.prospects)}

USER RECAP (verbatim — parse only what is clearly stated):
"""
${opts.userText.slice(0, 12_000)}
"""

Return matches (with copied ids) and any unmatched mentions.`;

  const { object, usage } = await generateObject({
    model,
    schema: nlUpdateSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  const u = (usage ?? {}) as {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  return {
    result: object,
    model: modelId,
    usage: {
      promptTokens: u.inputTokens ?? u.promptTokens ?? 0,
      cachedPromptTokens: u.cachedInputTokens ?? 0,
      completionTokens: u.outputTokens ?? u.completionTokens ?? 0,
    },
  };
}
