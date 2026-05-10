"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  INTERACTION_TYPE_VALUES,
  eventCompanies,
  interactions,
} from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const logSchema = z.object({
  eventCompanyId: z.uuid(),
  type: z.enum(INTERACTION_TYPE_VALUES),
  subject: z.string().max(280).nullable().optional(),
  body: z.string().max(20000).nullable().optional(),
  contactId: z.union([z.uuid(), z.null()]).optional(),
  occurredAt: z.union([z.date(), z.iso.datetime(), z.literal("")]).optional(),
});

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

  const [row] = await db
    .insert(interactions)
    .values({
      eventId: ec.eventId,
      eventCompanyId: data.eventCompanyId,
      contactId: data.contactId ?? null,
      userId: session.user.id,
      type: data.type,
      subject: data.subject ?? null,
      body: data.body ?? null,
      occurredAt,
    })
    .returning({ id: interactions.id });
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
  if ("body" in patch) updates.body = patch.body ?? null;
  if (patch.occurredAt) {
    updates.occurredAt =
      patch.occurredAt instanceof Date
        ? patch.occurredAt
        : new Date(patch.occurredAt);
  }

  await db.update(interactions).set(updates).where(eq(interactions.id, id));

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
