import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";

/**
 * Returns true if at least one of the LLM credentials is configured.
 * Supports three auth paths:
 *  1. Explicit AI_GATEWAY_API_KEY
 *  2. Direct ANTHROPIC_API_KEY (local fallback)
 *  3. VERCEL_OIDC_TOKEN — injected by `vercel env pull` locally or auto-present
 *     on deployed Vercel functions (no separate key needed).
 */
export function isAiConfigured(): boolean {
  if (env.AI_GATEWAY_API_KEY || env.ANTHROPIC_API_KEY) return true;
  if (process.env.VERCEL_OIDC_TOKEN) return true;
  // On Vercel deployments, OIDC is always available even before env pull.
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") return true;
  return false;
}

export function aiConfigurationStatus(): {
  ok: boolean;
  reason?: string;
} {
  if (isAiConfigured()) return { ok: true };
  return {
    ok: false,
    reason:
      "AI is not configured. Set AI_GATEWAY_API_KEY (Vercel → AI tab) or ANTHROPIC_API_KEY.",
  };
}

/**
 * Default model id for enrichment. Override via AI_MODEL_ID env var.
 * Format follows AI Gateway convention: "<provider>/<model>".
 * Examples: "anthropic/claude-sonnet-4-6", "anthropic/claude-opus-4-7".
 */
export const DEFAULT_MODEL_ID = env.AI_MODEL_ID;

/**
 * Pricing per 1M tokens (USD). Source of truth for cost calculation.
 * Keep aligned with the model ids we actually use. Numbers are conservative
 * upper bounds — if pricing changes upstream we'd rather over-report than
 * under-bill our daily spend cap.
 */
const PRICING_PER_MILLION: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "anthropic/claude-sonnet-4-6": { input: 3.0, cachedInput: 0.3, output: 15.0 },
  "anthropic/claude-opus-4-7": { input: 15.0, cachedInput: 1.5, output: 75.0 },
  "anthropic/claude-haiku-4-5": { input: 0.8, cachedInput: 0.08, output: 4.0 },
};

export function calculateCostUsd(opts: {
  model: string;
  promptTokens: number;
  cachedPromptTokens?: number;
  completionTokens: number;
}): number {
  const p =
    PRICING_PER_MILLION[opts.model] ?? PRICING_PER_MILLION[DEFAULT_MODEL_ID];
  if (!p) return 0;
  const fresh = Math.max(0, opts.promptTokens - (opts.cachedPromptTokens ?? 0));
  const cached = opts.cachedPromptTokens ?? 0;
  const out = opts.completionTokens;
  return (
    (fresh * p.input + cached * p.cachedInput + out * p.output) / 1_000_000
  );
}

/**
 * Resolve the AI SDK LanguageModel for a "provider/model" string.
 *
 * On Vercel with AI_GATEWAY_API_KEY (or OIDC), the `ai` package routes the
 * call through the gateway automatically. If only ANTHROPIC_API_KEY is set,
 * fall back to the direct provider package so we can still talk to the model.
 */
export async function resolveModel(
  modelId: string = DEFAULT_MODEL_ID,
): Promise<LanguageModel> {
  // Gateway path: AI SDK v6 accepts plain provider/model strings when the
  // gateway is wired via AI_GATEWAY_API_KEY, VERCEL_OIDC_TOKEN (from
  // `vercel env pull`), or the auto-injected OIDC on deployed Vercel functions.
  if (
    env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL
  ) {
    return modelId as unknown as LanguageModel;
  }
  // Direct Anthropic fallback for local dev w/o gateway access.
  if (env.ANTHROPIC_API_KEY && modelId.startsWith("anthropic/")) {
    const { anthropic } = await import("@ai-sdk/anthropic");
    const stripped = modelId.slice("anthropic/".length);
    return anthropic(stripped) as unknown as LanguageModel;
  }
  throw new Error(
    "No AI credentials available. Set AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY.",
  );
}

/**
 * Suggestion shape that the model must return.
 * Mirrors the four whitelisted outreach fields on eventCompany.
 */
export const enrichmentSchema = z.object({
  suggestions: z
    .array(
      z.object({
        field: z.enum([
          "whyTheyShouldAttend",
          "keyTalkingPoints",
          "emailAngle",
          "sponsorshipHook",
        ]),
        suggestion: z
          .string()
          .min(20)
          .max(2000)
          .describe("Plain-text draft for the field. No markdown."),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("0-1, the model's confidence in the suggestion."),
        reasoning: z
          .string()
          .min(10)
          .max(500)
          .describe("1-2 sentences explaining why this fits."),
        sourceUrls: z
          .array(z.url())
          .max(8)
          .describe("URLs cited from the web search results."),
      }),
    )
    .min(1)
    .max(4),
});

export type EnrichmentResult = z.infer<typeof enrichmentSchema>;

export async function runEnrichment(opts: {
  modelId?: string;
  systemContext: string;
  userPrompt: string;
}): Promise<{
  result: EnrichmentResult;
  usage: {
    promptTokens: number;
    cachedPromptTokens: number;
    completionTokens: number;
  };
  model: string;
}> {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const model = await resolveModel(modelId);

  const { object, usage } = await generateObject({
    model,
    schema: enrichmentSchema,
    system: opts.systemContext,
    prompt: opts.userPrompt,
    // Modest output cap; suggestions are short.
    providerOptions: {
      anthropic: {
        // Cache the system block; helps repeated calls within 5 min window.
        cacheControl: { type: "ephemeral" },
      },
    },
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
