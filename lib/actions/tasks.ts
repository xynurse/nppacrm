"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isUndefinedColumnError } from "@/lib/db/errors";
import {
  PROSPECT_PRIORITY_VALUES,
  eventCompanies,
  tasks,
} from "@/lib/db/schema";
import { prepareDocForStorage, richDocSchema } from "@/lib/tiptap/serialize";
import type { RichDoc } from "@/lib/tiptap/types";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * Mirrors `resolveBody` in the interactions action: a rich doc regenerates the
 * plain-text column, and description-only callers (the watch agent, the
 * proposal follow-up) keep working untouched.
 */
function resolveDescription(input: {
  description?: string | null;
  descriptionDoc?: RichDoc | null;
}): { description: string | null; descriptionDoc: RichDoc | null } {
  if (input.descriptionDoc === undefined) {
    return { description: input.description ?? null, descriptionDoc: null };
  }
  const { doc, text } = prepareDocForStorage(input.descriptionDoc);
  return { description: text, descriptionDoc: doc };
}

const dateSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    z.literal(""),
    z.null(),
  ])
  .optional();

const createSchema = z
  .object({
    eventId: z.uuid().optional(),
    eventCompanyId: z.union([z.uuid(), z.null()]).optional(),
    title: z.string().min(1).max(280),
    description: z.string().max(20000).nullable().optional(),
    descriptionDoc: richDocSchema.nullable().optional(),
    dueDate: dateSchema,
    priority: z.enum(PROSPECT_PRIORITY_VALUES).optional(),
    assignedTo: z.union([z.uuid(), z.null()]).optional(),
  })
  .refine((d) => d.eventId || d.eventCompanyId, {
    message: "eventId or eventCompanyId is required",
  });

export async function createTask(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const data = parsed.data;

  let eventId = data.eventId ?? null;
  if (data.eventCompanyId) {
    const [ec] = await db
      .select({ eventId: eventCompanies.eventId })
      .from(eventCompanies)
      .where(eq(eventCompanies.id, data.eventCompanyId))
      .limit(1);
    if (!ec) return { ok: false, error: "Prospect not found" };
    eventId = ec.eventId;
  }
  if (!eventId) return { ok: false, error: "eventId is required" };

  const { description, descriptionDoc } = resolveDescription(data);
  const values = {
    eventId,
    eventCompanyId: data.eventCompanyId ?? null,
    title: data.title.trim(),
    description,
    dueDate: data.dueDate ? data.dueDate : null,
    priority: data.priority ?? "medium",
    assignedTo: data.assignedTo ?? session.user.id,
    createdBy: session.user.id,
  };

  let row: { id: string } | undefined;
  try {
    [row] = await db
      .insert(tasks)
      .values({ ...values, descriptionDoc })
      .returning({ id: tasks.id });
  } catch (err) {
    // Pre-0011: keep the task, drop only the rich formatting.
    if (!isUndefinedColumnError(err)) throw err;
    [row] = await db.insert(tasks).values(values).returning({ id: tasks.id });
  }
  if (!row) return { ok: false, error: "Failed to create task" };

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "task.create",
    entityType: "task",
    entityId: row.id,
    changes: {
      title: data.title.trim(),
      eventCompanyId: data.eventCompanyId ?? null,
      assignedTo: data.assignedTo ?? session.user.id,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/tasks");
  return { ok: true, data: { id: row.id } };
}

const updateSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(280).optional(),
  description: z.string().max(20000).nullable().optional(),
  descriptionDoc: richDocSchema.nullable().optional(),
  dueDate: dateSchema,
  priority: z.enum(PROSPECT_PRIORITY_VALUES).optional(),
  assignedTo: z.union([z.uuid(), z.null()]).optional(),
});

export async function updateTask(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, ...patch } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if ("title" in patch && patch.title) updates.title = patch.title.trim();
  if ("description" in patch || "descriptionDoc" in patch) {
    const resolved = resolveDescription(patch);
    updates.description = resolved.description;
    if ("descriptionDoc" in patch) {
      updates.descriptionDoc = resolved.descriptionDoc;
    }
  }
  if ("dueDate" in patch) updates.dueDate = patch.dueDate ? patch.dueDate : null;
  if ("priority" in patch && patch.priority) updates.priority = patch.priority;
  if ("assignedTo" in patch) updates.assignedTo = patch.assignedTo ?? null;

  try {
    await db.update(tasks).set(updates).where(eq(tasks.id, id));
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    const withoutDoc = { ...updates };
    delete withoutDoc.descriptionDoc;
    await db.update(tasks).set(withoutDoc).where(eq(tasks.id, id));
  }

  await recordAudit({
    userId: session.user.id,
    action: "task.update",
    entityType: "task",
    entityId: id,
    changes: patch,
  });

  revalidatePath("/companies");
  revalidatePath("/tasks");
  return { ok: true };
}

const completeSchema = z.object({
  id: z.uuid(),
  completed: z.boolean(),
});

export async function setTaskCompleted(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = completeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await db
    .update(tasks)
    .set({
      completedAt: parsed.data.completed ? new Date() : null,
      completedBy: parsed.data.completed ? session.user.id : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: parsed.data.completed ? "task.complete" : "task.uncomplete",
    entityType: "task",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  revalidatePath("/tasks");
  return { ok: true };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deleteTask(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await db.delete(tasks).where(eq(tasks.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "task.delete",
    entityType: "task",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  revalidatePath("/tasks");
  return { ok: true };
}
