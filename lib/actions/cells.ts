"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import {
  FIELD_REGISTRY,
  isFieldKey,
  normalizeValue,
  valueValidator,
} from "@/lib/cells/registry";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
  type ProspectStatus,
} from "@/lib/db/schema";
import {
  changeStatus,
  changeStatuses,
  SKIP_REASON_TEXT,
} from "@/lib/pipeline/change-status";

type ActionResult = { ok: true } | { ok: false; error: string };

const updateFieldSchema = z.object({
  fieldKey: z.string(),
  entityId: z.uuid(),
  value: z.unknown(),
});

export async function updateField(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateFieldSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }
  const { fieldKey, entityId } = parsed.data;
  if (!isFieldKey(fieldKey)) {
    return { ok: false, error: `Unknown field ${fieldKey}` };
  }
  const field = FIELD_REGISTRY[fieldKey];
  const normalized = normalizeValue(field, parsed.data.value);
  const validation = valueValidator(field).safeParse(normalized);
  if (!validation.success) {
    return {
      ok: false,
      error: validation.error.issues[0]?.message ?? "Invalid value",
    };
  }

  const value =
    field.type === "date" && validation.data
      ? new Date(validation.data as string)
      : validation.data;

  if (fieldKey === "eventCompany.status") {
    if (typeof value !== "string" || !value) {
      return { ok: false, error: "Status is required" };
    }
    const r = await changeStatus({
      id: entityId,
      to: value as ProspectStatus,
      actor: session.user,
      source: "cell",
    });
    if (!r.ok) return r;
    revalidatePath("/companies");
    revalidatePath("/pipeline");
    return { ok: true };
  }

  if (field.entity === "eventCompany") {
    const setObj: Record<string, unknown> = {
      [camelOf(field.column)]: value,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };
    const updated = await db
      .update(eventCompanies)
      .set(setObj)
      .where(
        and(eq(eventCompanies.id, entityId), isNull(eventCompanies.deletedAt)),
      )
      .returning({ id: eventCompanies.id });
    if (updated.length === 0) return { ok: false, error: "Prospect not found" };
  } else {
    const setObj: Record<string, unknown> = {
      [camelOf(field.column)]: value,
      updatedAt: new Date(),
    };
    await db.update(companies).set(setObj).where(eq(companies.id, entityId));
  }

  await recordAudit({
    userId: session.user.id,
    action: `${field.entity}.update_field`,
    entityType: field.entity,
    entityId,
    changes: { [field.column]: value },
  });

  revalidatePath("/companies");
  return { ok: true };
}

function camelOf(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

const bulkUpdateSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
  patch: z.object({
    status: z.enum(PROSPECT_STATUS_VALUES).optional(),
    priority: z.enum(PROSPECT_PRIORITY_VALUES).optional(),
    ownerId: z.union([z.uuid(), z.null()]).optional(),
  }),
});

export async function bulkRemoveTag(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = z
    .object({
      ids: z.array(z.uuid()).min(1).max(500),
      tag: z.string().min(1).max(64),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const rows = await db
    .select({ id: eventCompanies.id, tagsCache: eventCompanies.tagsCache })
    .from(eventCompanies)
    .where(inArray(eventCompanies.id, parsed.data.ids));

  const tag = parsed.data.tag;
  for (const row of rows) {
    const next = (row.tagsCache ?? []).filter((t) => t !== tag);
    if (next.length === (row.tagsCache ?? []).length) continue;
    await db
      .update(eventCompanies)
      .set({
        tagsCache: next,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(eventCompanies.id, row.id));
  }

  await recordAudit({
    userId: session.user.id,
    action: "eventCompany.bulk_remove_tag",
    entityType: "eventCompany",
    entityId: parsed.data.ids[0]!,
    changes: { ids: parsed.data.ids, tag },
  });

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
}

export type BulkUpdateResult =
  | { ok: true; updated: number; skipped: { reason: string; count: number }[] }
  | { ok: false; error: string };

export async function bulkUpdateEventCompanies(
  raw: unknown,
): Promise<BulkUpdateResult> {
  const session = await requireSession();
  const parsed = bulkUpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { ids, patch } = parsed.data;

  let updated = 0;
  const skipped: { reason: string; count: number }[] = [];

  // Status goes through the shared path: per-row move_status audit, confirm
  // gate, owner notifications, benefits.
  if (patch.status !== undefined) {
    const r = await changeStatuses({
      ids,
      to: patch.status,
      actor: session.user,
      source: "bulk",
    });
    updated = r.updated.length;
    const counts = new Map<string, number>();
    for (const s of r.skipped) {
      const text = SKIP_REASON_TEXT[s.reason];
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
    for (const [reason, count] of counts) skipped.push({ reason, count });
  }

  const updates: Record<string, unknown> = {};
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.ownerId !== undefined) updates.ownerId = patch.ownerId;

  if (Object.keys(updates).length > 0) {
    const rows = await db
      .update(eventCompanies)
      .set({ ...updates, updatedAt: new Date(), updatedBy: session.user.id })
      .where(
        and(
          inArray(eventCompanies.id, ids),
          isNull(eventCompanies.deletedAt),
        ),
      )
      .returning({ id: eventCompanies.id });
    updated = Math.max(updated, rows.length);

    await recordAudit({
      userId: session.user.id,
      action: "eventCompany.bulk_update",
      entityType: "eventCompany",
      entityId: `bulk:${ids.length}`,
      changes: { ids, patch: updates },
    });
  }

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true, updated, skipped };
}

const quickAddSchema = z.object({
  eventId: z.uuid(),
  name: z.string().min(1).max(160),
});

export async function quickAddEventCompany(
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = quickAddSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Name is required" };

  const [company] = await db
    .insert(companies)
    .values({ name: parsed.data.name })
    .returning({ id: companies.id });
  if (!company) return { ok: false, error: "Failed to create company" };

  const [ec] = await db
    .insert(eventCompanies)
    .values({
      eventId: parsed.data.eventId,
      companyId: company.id,
      ownerId: session.user.id,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    })
    .returning({ id: eventCompanies.id });
  if (!ec) return { ok: false, error: "Failed to create event company" };

  await recordAudit({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    action: "eventCompany.quick_add",
    entityType: "eventCompany",
    entityId: ec.id,
    changes: { companyId: company.id, name: parsed.data.name },
  });

  revalidatePath("/companies");
  return { ok: true, id: ec.id };
}

const softDeleteSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});

export async function softDeleteEventCompanies(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = softDeleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const now = new Date();
  await db
    .update(eventCompanies)
    .set({ deletedAt: now, updatedAt: now, updatedBy: session.user.id })
    .where(inArray(eventCompanies.id, parsed.data.ids));

  await recordAudit({
    userId: session.user.id,
    action: "eventCompany.soft_delete",
    entityType: "eventCompany",
    entityId: `bulk:${parsed.data.ids.length}`,
    changes: { ids: parsed.data.ids },
  });

  revalidatePath("/companies");
  return { ok: true };
}
