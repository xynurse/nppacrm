"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { savedViews } from "@/lib/db/schema";
import {
  deleteSavedViewSchema,
  sanitizeFilter,
  sanitizeSort,
  upsertSavedViewSchema,
} from "@/lib/views/schema";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function createSavedView(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = upsertSavedViewSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { eventId, name, isShared, filter, sort, columns } = parsed.data;

  if (isShared && session.user.role !== "admin") {
    return { ok: false, error: "Only admins can save shared views" };
  }

  const cleanFilter = sanitizeFilter(filter);
  const cleanSort = sanitizeSort(sort);

  const [created] = await db
    .insert(savedViews)
    .values({
      eventId,
      ownerId: isShared ? null : session.user.id,
      scope: "companies",
      name,
      isShared,
      filter: cleanFilter,
      sort: cleanSort,
      columns: columns ?? [],
    })
    .returning({ id: savedViews.id });

  if (!created) {
    return { ok: false, error: "Failed to save view" };
  }

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "saved_view.create",
    entityType: "saved_view",
    entityId: created.id,
    changes: { name, isShared, filter: cleanFilter, sort: cleanSort },
  });

  revalidatePath("/companies");
  return { ok: true, id: created.id };
}

export async function updateSavedView(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = upsertSavedViewSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: parsed.success ? "Missing id" : "Invalid" };
  }
  const { id, eventId, name, isShared, filter, sort, columns } = parsed.data;

  const [existing] = await db
    .select()
    .from(savedViews)
    .where(eq(savedViews.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "View not found" };

  const isOwner = existing.ownerId === session.user.id;
  const isShared_ = existing.isShared || existing.ownerId === null;
  if (!isOwner && session.user.role !== "admin") {
    return { ok: false, error: "Not allowed" };
  }
  if (isShared_ && session.user.role !== "admin" && !isOwner) {
    return { ok: false, error: "Only admins can edit shared views" };
  }

  if (isShared && session.user.role !== "admin") {
    return { ok: false, error: "Only admins can mark views as shared" };
  }

  const cleanFilter = sanitizeFilter(filter);
  const cleanSort = sanitizeSort(sort);

  await db
    .update(savedViews)
    .set({
      name,
      isShared,
      ownerId: isShared ? null : (existing.ownerId ?? session.user.id),
      filter: cleanFilter,
      sort: cleanSort,
      columns: columns ?? existing.columns,
      updatedAt: new Date(),
    })
    .where(and(eq(savedViews.id, id), eq(savedViews.eventId, eventId)));

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "saved_view.update",
    entityType: "saved_view",
    entityId: id,
    changes: { name, isShared, filter: cleanFilter, sort: cleanSort },
  });

  revalidatePath("/companies");
  return { ok: true };
}

export async function deleteSavedView(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = deleteSavedViewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const [existing] = await db
    .select()
    .from(savedViews)
    .where(eq(savedViews.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "View not found" };

  const isOwner = existing.ownerId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return { ok: false, error: "Not allowed" };
  }
  if ((existing.isShared || existing.ownerId === null) && !isAdmin) {
    return { ok: false, error: "Only admins can delete shared views" };
  }

  await db.delete(savedViews).where(eq(savedViews.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "saved_view.delete",
    entityType: "saved_view",
    entityId: parsed.data.id,
    changes: { name: existing.name },
  });

  revalidatePath("/companies");
  return { ok: true };
}

export async function setDefaultView(input: {
  id: string;
  eventId: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  await db
    .update(savedViews)
    .set({ isDefault: false })
    .where(
      and(
        eq(savedViews.eventId, input.eventId),
        eq(savedViews.scope, "companies"),
      ),
    );
  await db
    .update(savedViews)
    .set({ isDefault: true })
    .where(eq(savedViews.id, input.id));

  await recordAudit({
    userId: session.user.id,
    eventId: input.eventId,
    action: "saved_view.set_default",
    entityType: "saved_view",
    entityId: input.id,
    changes: {},
  });

  revalidatePath("/companies");
  return { ok: true };
}
