"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  aiConfigurationStatus,
  calculateCostUsd,
} from "@/lib/ai/gateway";
import {
  runNlUpdate,
  type NlProspect,
} from "@/lib/ai/nl-update";
import { checkSpendCap } from "@/lib/ai/spend";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { createTask } from "@/lib/actions/tasks";
import { logInteraction } from "@/lib/actions/interactions";
import { moveEventCompanyStatus } from "@/lib/actions/pipeline";
import { updateField } from "@/lib/actions/cells";
import { db } from "@/lib/db";
import {
  INTERACTION_TYPE_VALUES,
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
  companies,
  eventCompanies,
} from "@/lib/db/schema";
import { listActiveEvents } from "@/lib/db/queries/events";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// The op shape the client sends back on Apply. Re-validated here so the client
// can never smuggle a non-whitelisted operation past the server.
const applyOpSchema = z.object({
  kind: z.enum([
    "set_status",
    "log_interaction",
    "bump_last_contacted",
    "set_next_action_at",
    "create_task",
  ]),
  status: z.enum(PROSPECT_STATUS_VALUES).nullable().optional(),
  interactionType: z.enum(INTERACTION_TYPE_VALUES).nullable().optional(),
  subject: z.string().max(280).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  title: z.string().max(280).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(PROSPECT_PRIORITY_VALUES).nullable().optional(),
});

const applySchema = z.object({
  items: z
    .array(
      z.object({
        companyId: z.uuid(),
        companyName: z.string(),
        ops: z.array(applyOpSchema).min(1),
      }),
    )
    .min(1),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/u;
function toDateOnly(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = ISO_DATE.exec(v.trim());
  return m ? v.trim().slice(0, 10) : null;
}

async function resolveActiveEventId(
  sessionEventId: string | null,
): Promise<string | null> {
  const events = await listActiveEvents();
  const match = events.find((e) => e.id === sessionEventId);
  return match?.id ?? events[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Propose — read-only. Sends the recap + prospect list to the model and returns
// a proposal. Writes NOTHING to CRM data.
// ---------------------------------------------------------------------------

const proposeSchema = z.object({ text: z.string().min(1).max(12_000) });

export type NlProposalMatch = {
  companyId: string;
  companyName: string;
  currentStatus: string;
  currentLastContact: string | null;
  ops: z.infer<typeof applyOpSchema>[];
};

export async function proposeNlUpdate(raw: unknown): Promise<
  ActionResult<{
    matches: NlProposalMatch[];
    unmatched: string[];
    costUsd: number;
  }>
> {
  const session = await requireSession();
  const parsed = proposeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Enter some text to parse." };
  }

  const ai = aiConfigurationStatus();
  if (!ai.ok) return { ok: false, error: ai.reason ?? "AI not configured" };

  const cap = await checkSpendCap();
  if (!cap.ok) {
    return {
      ok: false,
      error: `Daily AI spend cap reached ($${cap.spentUsd.toFixed(2)} / $${cap.capUsd.toFixed(2)}). Try again tomorrow or raise AI_DAILY_SPEND_CAP_USD.`,
    };
  }

  const eventId = await resolveActiveEventId(session.user.activeEventId);
  if (!eventId) return { ok: false, error: "No active event." };

  const rows = await db
    .select({
      id: eventCompanies.id,
      name: companies.name,
      status: eventCompanies.status,
      lastContactedAt: eventCompanies.lastContactedAt,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        isNull(companies.deletedAt),
      ),
    );

  if (rows.length === 0) {
    return { ok: false, error: "No prospects on the active event yet." };
  }

  const prospects: NlProspect[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    lastContactedAt: r.lastContactedAt,
  }));
  const byId = new Map(prospects.map((p) => [p.id, p]));

  let model = "";
  let costUsd = 0;
  let result;
  try {
    const run = await runNlUpdate({
      prospects,
      userText: parsed.data.text,
      todayIso: new Date().toISOString().slice(0, 10),
    });
    result = run.result;
    model = run.model;
    costUsd = calculateCostUsd({
      model: run.model,
      promptTokens: run.usage.promptTokens,
      cachedPromptTokens: run.usage.cachedPromptTokens,
      completionTokens: run.usage.completionTokens,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI parse failed",
    };
  }

  // Keep only matches whose id the model copied correctly from our list; any
  // hallucinated id is dropped and folded into unmatched.
  const matches: NlProposalMatch[] = [];
  const droppedNames: string[] = [];
  for (const m of result.matches) {
    const prospect = byId.get(m.companyId);
    if (!prospect) {
      droppedNames.push(m.companyName || m.companyId);
      continue;
    }
    matches.push({
      companyId: prospect.id,
      companyName: prospect.name,
      currentStatus: prospect.status,
      currentLastContact: prospect.lastContactedAt
        ? prospect.lastContactedAt.toISOString().slice(0, 10)
        : null,
      ops: m.ops.map((op) => applyOpSchema.parse(op)),
    });
  }
  const unmatched = [...result.unmatched, ...droppedNames];

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "ai.nl_update_propose",
    entityType: "event",
    entityId: eventId,
    changes: {
      model,
      costUsd,
      matchCount: matches.length,
      unmatchedCount: unmatched.length,
      textChars: parsed.data.text.length,
    },
  });

  return { ok: true, matches, unmatched, costUsd };
}

// ---------------------------------------------------------------------------
// Apply — writes the user-approved subset through the EXISTING server actions,
// so audit rows, validation, and cache revalidation all come for free.
// ---------------------------------------------------------------------------

export type NlApplyItemResult = {
  companyId: string;
  companyName: string;
  applied: string[];
  skipped: { kind: string; reason: string }[];
};

export async function applyNlUpdate(raw: unknown): Promise<
  ActionResult<{ results: NlApplyItemResult[]; appliedCount: number }>
> {
  const session = await requireSession();
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Nothing to apply." };
  }

  const eventId = await resolveActiveEventId(session.user.activeEventId);
  if (!eventId) return { ok: false, error: "No active event." };

  const results: NlApplyItemResult[] = [];
  let appliedCount = 0;

  for (const item of parsed.data.items) {
    const applied: string[] = [];
    const skipped: { kind: string; reason: string }[] = [];

    for (const op of item.ops) {
      try {
        if (op.kind === "set_status") {
          if (!op.status) {
            skipped.push({ kind: op.kind, reason: "no status" });
            continue;
          }
          // Confirmed requires amount + tier, captured only by the app's
          // confirm modal — never a bare status flip here.
          if (op.status === "confirmed") {
            skipped.push({
              kind: op.kind,
              reason: "confirm in the pipeline modal (amount + tier)",
            });
            continue;
          }
          const r = await moveEventCompanyStatus({
            id: item.companyId,
            status: op.status,
          });
          if (r.ok) {
            applied.push(`status → ${op.status}`);
          } else {
            skipped.push({ kind: op.kind, reason: r.error });
          }
        } else if (op.kind === "log_interaction") {
          const r = await logInteraction({
            eventCompanyId: item.companyId,
            type: op.interactionType ?? "note",
            subject: op.subject ?? null,
            body: op.body ?? null,
            occurredAt: toDateOnly(op.occurredAt) ?? "",
          });
          if (r.ok) {
            applied.push(`logged ${op.interactionType ?? "note"}`);
          } else {
            skipped.push({ kind: op.kind, reason: r.error });
          }
        } else if (op.kind === "bump_last_contacted") {
          const value = toDateOnly(op.occurredAt);
          if (!value) {
            skipped.push({ kind: op.kind, reason: "no date" });
            continue;
          }
          const r = await updateField({
            fieldKey: "eventCompany.lastContactedAt",
            entityId: item.companyId,
            value,
          });
          if (r.ok) applied.push(`last contact → ${value}`);
          else skipped.push({ kind: op.kind, reason: r.error });
        } else if (op.kind === "set_next_action_at") {
          const value = toDateOnly(op.date);
          if (!value) {
            skipped.push({ kind: op.kind, reason: "no date" });
            continue;
          }
          const r = await updateField({
            fieldKey: "eventCompany.nextActionAt",
            entityId: item.companyId,
            value,
          });
          if (r.ok) applied.push(`next action → ${value}`);
          else skipped.push({ kind: op.kind, reason: r.error });
        } else if (op.kind === "create_task") {
          if (!op.title) {
            skipped.push({ kind: op.kind, reason: "no title" });
            continue;
          }
          const r = await createTask({
            eventCompanyId: item.companyId,
            title: op.title,
            dueDate: toDateOnly(op.dueDate),
            priority: op.priority ?? undefined,
          });
          if (r.ok) applied.push(`task: ${op.title}`);
          else skipped.push({ kind: op.kind, reason: r.error });
        }
      } catch (err) {
        skipped.push({
          kind: op.kind,
          reason: err instanceof Error ? err.message : "failed",
        });
      }
    }

    appliedCount += applied.length;
    results.push({
      companyId: item.companyId,
      companyName: item.companyName,
      applied,
      skipped,
    });
  }

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "ai.nl_update_apply",
    entityType: "event",
    entityId: eventId,
    changes: {
      companyCount: results.length,
      appliedCount,
      summary: results.map((r) => ({
        company: r.companyName,
        applied: r.applied,
      })),
    },
  });

  return { ok: true, results, appliedCount };
}
