"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  customFieldDefinitions,
  eventCompanies,
} from "@/lib/db/schema";
import {
  createFieldDefinitionSchema,
  deleteFieldDefinitionSchema,
  updateCustomFieldSchema,
  updateFieldDefinitionSchema,
} from "@/lib/schemas/custom-fields";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function createFieldDefinition(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const parsed = createFieldDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const data = parsed.data;

  const [created] = await db
    .insert(customFieldDefinitions)
    .values({
      eventId: data.eventId,
      entityType: data.entityType,
      key: data.key,
      label: data.label,
      fieldType: data.fieldType,
      config: data.options ? { options: data.options } : {},
      isRequired: data.isRequired,
      displayOrder: data.displayOrder,
    })
    .returning({ id: customFieldDefinitions.id });

  if (!created) return { ok: false, error: "Failed to create field" };

  await recordAudit({
    userId: session.user.id,
    eventId: data.eventId,
    action: "custom_field.create",
    entityType: "custom_field_definition",
    entityId: created.id,
    changes: {
      key: data.key,
      label: data.label,
      fieldType: data.fieldType,
    },
  });

  revalidatePath(`/admin/events/${data.eventId}/fields`);
  revalidatePath("/companies");
  return { ok: true, id: created.id };
}

export async function updateFieldDefinition(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateFieldDefinitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { id, ...rest } = parsed.data;

  const [existing] = await db
    .select()
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: "Field not found" };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (rest.label !== undefined) updates.label = rest.label;
  if (rest.isRequired !== undefined) updates.isRequired = rest.isRequired;
  if (rest.displayOrder !== undefined) updates.displayOrder = rest.displayOrder;
  if (rest.options !== undefined)
    updates.config = { ...existing.config, options: rest.options };

  await db
    .update(customFieldDefinitions)
    .set(updates)
    .where(eq(customFieldDefinitions.id, id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "custom_field.update",
    entityType: "custom_field_definition",
    entityId: id,
    changes: rest,
  });

  revalidatePath(`/admin/events/${existing.eventId}/fields`);
  revalidatePath("/companies");
  return { ok: true };
}

export async function deleteFieldDefinition(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = deleteFieldDefinitionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const [existing] = await db
    .select()
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Field not found" };

  await db
    .delete(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "custom_field.delete",
    entityType: "custom_field_definition",
    entityId: parsed.data.id,
    changes: { key: existing.key, label: existing.label },
  });

  revalidatePath(`/admin/events/${existing.eventId}/fields`);
  revalidatePath("/companies");
  return { ok: true };
}

export async function updateCustomField(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateCustomFieldSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { entityId, definitionId, value } = parsed.data;

  const [def] = await db
    .select()
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, definitionId))
    .limit(1);
  if (!def) return { ok: false, error: "Field definition not found" };

  if (!validateValueForField(def.fieldType, def.config, value)) {
    return { ok: false, error: "Invalid value for this field type" };
  }

  if (def.entityType !== "eventCompany") {
    return { ok: false, error: "Unsupported entity" };
  }

  const [existing] = await db
    .select({
      eventId: eventCompanies.eventId,
      customFields: eventCompanies.customFields,
    })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, entityId))
    .limit(1);
  if (!existing) return { ok: false, error: "Record not found" };

  if (existing.eventId !== def.eventId) {
    return { ok: false, error: "Field does not belong to this event" };
  }

  const next = { ...(existing.customFields ?? {}) };
  if (value === null || value === "") {
    delete next[def.key];
  } else {
    next[def.key] = value;
  }

  await db
    .update(eventCompanies)
    .set({
      customFields: next,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(eventCompanies.id, entityId));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "eventCompany.update_custom_field",
    entityType: "eventCompany",
    entityId,
    changes: { key: def.key, value },
  });

  revalidatePath("/companies");
  return { ok: true };
}

function validateValueForField(
  fieldType: string,
  config: { options?: Array<{ value: string; label: string }> },
  value: unknown,
): boolean {
  if (value === null || value === "") return true;
  switch (fieldType) {
    case "text":
    case "longText":
    case "url":
      return typeof value === "string";
    case "number":
    case "currency":
      return (
        typeof value === "string" &&
        /^-?\d+(\.\d+)?$/.test(value) &&
        Number.isFinite(Number(value))
      );
    case "date":
      return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(value)
      );
    case "checkbox":
      return typeof value === "boolean";
    case "singleSelect": {
      if (typeof value !== "string") return false;
      const opts = config.options ?? [];
      return opts.some((o) => o.value === value);
    }
    case "file":
      return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as { url?: unknown }).url === "string"
      );
    default:
      return false;
  }
}

