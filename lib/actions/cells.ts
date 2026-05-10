"use server";

import { eq, inArray } from "drizzle-orm";
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
} from "@/lib/db/schema";

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

  if (field.entity === "eventCompany") {
    const setObj: Record<string, unknown> = {
      [camelOf(field.column)]: value,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };
    await db
      .update(eventCompanies)
      .set(setObj)
      .where(eq(eventCompanies.id, entityId));
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

export async function bulkUpdateEventCompanies(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = bulkUpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: session.user.id };
  if (parsed.data.patch.status !== undefined)
    updates.status = parsed.data.patch.status;
  if (parsed.data.patch.priority !== undefined)
    updates.priority = parsed.data.patch.priority;
  if (parsed.data.patch.ownerId !== undefined)
    updates.ownerId = parsed.data.patch.ownerId;

  await db
    .update(eventCompanies)
    .set(updates)
    .where(inArray(eventCompanies.id, parsed.data.ids));

  await recordAudit({
    userId: session.user.id,
    action: "eventCompany.bulk_update",
    entityType: "eventCompany",
    entityId: `bulk:${parsed.data.ids.length}`,
    changes: { ids: parsed.data.ids, patch: parsed.data.patch },
  });

  revalidatePath("/companies");
  return { ok: true };
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
