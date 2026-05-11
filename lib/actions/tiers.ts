"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { sponsorshipTiers } from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const colorRegex = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(colorRegex).default("#64748b"),
  displayOrder: z.number().int().min(0).max(1000).default(0),
  suggestedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().regex(colorRegex).optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  suggestedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u)
    .nullable()
    .optional(),
});

const deleteSchema = z.object({ id: z.uuid() });

export async function createTier(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const [created] = await db
    .insert(sponsorshipTiers)
    .values({
      eventId: parsed.data.eventId,
      name: parsed.data.name,
      color: parsed.data.color,
      displayOrder: parsed.data.displayOrder,
      suggestedAmount: parsed.data.suggestedAmount ?? null,
    })
    .returning({ id: sponsorshipTiers.id });

  if (!created) return { ok: false, error: "Failed to create tier" };

  await recordAudit({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    action: "tier.create",
    entityType: "sponsorship_tier",
    entityId: created.id,
    changes: parsed.data,
  });

  revalidatePath(`/admin/events/${parsed.data.eventId}/tiers`);
  return { ok: true, id: created.id };
}

export async function updateTier(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, ...rest } = parsed.data;

  const [existing] = await db
    .select()
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Tier not found" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (rest.name !== undefined) updates.name = rest.name;
  if (rest.color !== undefined) updates.color = rest.color;
  if (rest.displayOrder !== undefined) updates.displayOrder = rest.displayOrder;
  if (rest.suggestedAmount !== undefined)
    updates.suggestedAmount = rest.suggestedAmount;

  await db
    .update(sponsorshipTiers)
    .set(updates)
    .where(eq(sponsorshipTiers.id, id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "tier.update",
    entityType: "sponsorship_tier",
    entityId: id,
    changes: rest,
  });

  revalidatePath(`/admin/events/${existing.eventId}/tiers`);
  return { ok: true };
}

export async function deleteTier(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const [existing] = await db
    .select()
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Tier not found" };

  await db.delete(sponsorshipTiers).where(eq(sponsorshipTiers.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "tier.delete",
    entityType: "sponsorship_tier",
    entityId: parsed.data.id,
    changes: { name: existing.name },
  });

  revalidatePath(`/admin/events/${existing.eventId}/tiers`);
  return { ok: true };
}
