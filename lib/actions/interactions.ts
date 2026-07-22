"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isUndefinedColumnError } from "@/lib/db/errors";
import {
  INTERACTION_TYPE_VALUES,
  eventCompanies,
  interactions,
} from "@/lib/db/schema";
import { prepareDocForStorage, richDocSchema } from "@/lib/tiptap/serialize";
import type { RichDoc } from "@/lib/tiptap/types";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const logSchema = z.object({
  eventCompanyId: z.uuid(),
  type: z.enum(INTERACTION_TYPE_VALUES),
  subject: z.string().max(280).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  bodyDoc: richDocSchema.nullable().optional(),
  contactId: z.union([z.uuid(), z.null()]).optional(),
  occurredAt: z.union([z.date(), z.iso.datetime(), z.literal("")]).optional(),
});

/**
 * Resolve what actually gets stored in the `body` / `body_doc` pair.
 *
 * A rich doc always wins and regenerates the plain-text mirror. Callers that
 * only pass `body` — the AI quick-update, the watch agent, the proposal flow,
 * the `/sync-outreach` skill — keep writing plain text exactly as before.
 */
function resolveBody(input: {
  body?: string | null;
  bodyDoc?: RichDoc | null;
}): { body: string | null; bodyDoc: RichDoc | null } {
  if (input.bodyDoc === undefined) {
    return { body: input.body ?? null, bodyDoc: null };
  }
  const { doc, text } = prepareDocForStorage(input.bodyDoc);
  return { body: text, bodyDoc: doc };
}

export async function logInteraction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = logSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const data = parsed.data;

  const [ec] = await db
    .select({ eventId: eventCompanies.eventId })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, data.eventCompanyId))
    .limit(1);
  if (!ec) return { ok: false, error: "Prospect not found" };

  const occurredAt =
    data.occurredAt instanceof Date
      ? data.occurredAt
      : data.occurredAt
        ? new Date(data.occurredAt)
        : new Date();

  const { body, bodyDoc } = resolveBody(data);
  const values = {
    eventId: ec.eventId,
    eventCompanyId: data.eventCompanyId,
    contactId: data.contactId ?? null,
    userId: session.user.id,
    type: data.type,
    subject: data.subject ?? null,
    body,
    occurredAt,
  };

  let row: { id: string } | undefined;
  try {
    [row] = await db
      .insert(interactions)
      .values({ ...values, bodyDoc })
      .returning({ id: interactions.id });
  } catch (err) {
    // Migration 0011 hasn't run yet — log the plain text so the user doesn't
    // lose what they wrote. The formatting is dropped, not the content.
    if (!isUndefinedColumnError(err)) throw err;
    [row] = await db
      .insert(interactions)
      .values(values)
      .returning({ id: interactions.id });
  }
  if (!row) return { ok: false, error: "Failed to log interaction" };

  await db
    .update(eventCompanies)
    .set({
      lastContactedAt: occurredAt,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(eventCompanies.id, data.eventCompanyId));

  await db
    .update(eventCompanies)
    .set({ firstContactedAt: occurredAt })
    .where(
      and(
        eq(eventCompanies.id, data.eventCompanyId),
        isNull(eventCompanies.firstContactedAt),
      ),
    );

  await recordAudit({
    userId: session.user.id,
    eventId: ec.eventId,
    action: "interaction.log",
    entityType: "interaction",
    entityId: row.id,
    changes: {
      type: data.type,
      eventCompanyId: data.eventCompanyId,
      subject: data.subject ?? null,
    },
  });

  revalidatePath("/companies");
  return { ok: true, data: { id: row.id } };
}

const updateSchema = z.object({
  id: z.uuid(),
  subject: z.string().max(280).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  bodyDoc: richDocSchema.nullable().optional(),
  occurredAt: z.union([z.date(), z.iso.datetime()]).optional(),
});

export async function updateInteraction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, ...patch } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if ("subject" in patch) updates.subject = patch.subject ?? null;
  if ("body" in patch || "bodyDoc" in patch) {
    const resolved = resolveBody(patch);
    updates.body = resolved.body;
    if ("bodyDoc" in patch) updates.bodyDoc = resolved.bodyDoc;
  }
  if (patch.occurredAt) {
    updates.occurredAt =
      patch.occurredAt instanceof Date
        ? patch.occurredAt
        : new Date(patch.occurredAt);
  }

  try {
    await db.update(interactions).set(updates).where(eq(interactions.id, id));
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    const withoutDoc = { ...updates };
    delete withoutDoc.bodyDoc;
    await db
      .update(interactions)
      .set(withoutDoc)
      .where(eq(interactions.id, id));
  }

  await recordAudit({
    userId: session.user.id,
    action: "interaction.update",
    entityType: "interaction",
    entityId: id,
    changes: patch,
  });

  revalidatePath("/companies");
  return { ok: true };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deleteInteraction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({
      userId: interactions.userId,
      eventId: interactions.eventId,
    })
    .from(interactions)
    .where(eq(interactions.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };

  if (
    session.user.role !== "admin" &&
    existing.userId !== session.user.id
  ) {
    return { ok: false, error: "You can only delete your own interactions" };
  }

  await db.delete(interactions).where(eq(interactions.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "interaction.delete",
    entityType: "interaction",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  return { ok: true };
}
