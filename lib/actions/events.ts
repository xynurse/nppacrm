"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { updateSession } from "@/auth";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { eventReviewers, events } from "@/lib/db/schema";
import {
  createEventSchema,
  setActiveEventSchema,
  updateEventSchema,
} from "@/lib/schemas/events";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { name, slug, startDate, endDate, fundraisingGoal, currency, timezone } =
    parsed.data;

  const [created] = await db
    .insert(events)
    .values({
      name,
      slug,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      fundraisingGoal: fundraisingGoal ?? null,
      currency,
      timezone,
    })
    .returning();

  if (!created) {
    return { ok: false, error: "Failed to create event" };
  }

  await recordAudit({
    userId: session.user.id,
    eventId: created.id,
    action: "event.create",
    entityType: "event",
    entityId: created.id,
    changes: { name, slug },
  });

  revalidatePath("/admin/events");
  return { ok: true };
}

export async function updateEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { id, ...rest } = parsed.data;
  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (rest.name !== undefined) updates.name = rest.name;
  if (rest.slug !== undefined) updates.slug = rest.slug;
  if (rest.startDate !== undefined) updates.startDate = rest.startDate ?? null;
  if (rest.endDate !== undefined) updates.endDate = rest.endDate ?? null;
  if (rest.fundraisingGoal !== undefined)
    updates.fundraisingGoal = rest.fundraisingGoal ?? null;
  if (rest.currency !== undefined) updates.currency = rest.currency;
  if (rest.timezone !== undefined) updates.timezone = rest.timezone;
  if (rest.status !== undefined) updates.status = rest.status;

  await db.update(events).set(updates).where(eq(events.id, id));

  await recordAudit({
    userId: session.user.id,
    eventId: id,
    action: "event.update",
    entityType: "event",
    entityId: id,
    changes: rest,
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function setActiveEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = setActiveEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid event" };
  }

  await updateSession({
    user: { activeEventId: parsed.data.eventId },
  });

  await recordAudit({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    action: "event.set_active",
    entityType: "user",
    entityId: session.user.id,
    changes: { activeEventId: parsed.data.eventId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addReviewer(input: {
  eventId: string;
  userId: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  await db
    .insert(eventReviewers)
    .values(input)
    .onConflictDoNothing({
      target: [eventReviewers.eventId, eventReviewers.userId],
    });

  await recordAudit({
    userId: session.user.id,
    eventId: input.eventId,
    action: "event.reviewer_add",
    entityType: "event_reviewer",
    entityId: `${input.eventId}:${input.userId}`,
    changes: input,
  });

  revalidatePath(`/admin/events/${input.eventId}`);
  return { ok: true };
}

export async function removeReviewer(input: {
  eventId: string;
  userId: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  await db
    .delete(eventReviewers)
    .where(
      and(
        eq(eventReviewers.eventId, input.eventId),
        eq(eventReviewers.userId, input.userId),
      ),
    );

  await recordAudit({
    userId: session.user.id,
    eventId: input.eventId,
    action: "event.reviewer_remove",
    entityType: "event_reviewer",
    entityId: `${input.eventId}:${input.userId}`,
    changes: input,
  });

  revalidatePath(`/admin/events/${input.eventId}`);
  return { ok: true };
}
