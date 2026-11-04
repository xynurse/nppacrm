"use server";

import { and, eq, gt, inArray, isNull, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { auditInsert, auditRows } from "@/lib/audit";
import { addCalendarDays, todayInTimeZone } from "@/lib/dates";
import { db } from "@/lib/db";
import { runAtomic } from "@/lib/db/batch";
import { eventCompanies, events, tasks } from "@/lib/db/schema";
import { getPlaybook, playbookTaskTitle } from "@/lib/playbooks";
import { runPlaybookSchema, undoPlaybookSchema } from "@/lib/schemas/playbooks";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Create every task of a playbook on one prospect, atomically, with audit rows. */
export async function runPlaybook(
  raw: unknown,
): Promise<ActionResult<{ taskIds: string[]; playbookName: string }>> {
  const session = await requireSession();
  const parsed = runPlaybookSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { eventCompanyId, playbookId } = parsed.data;

  const book = getPlaybook(playbookId);
  if (!book) return { ok: false, error: "Unknown playbook" };

  const [ec] = await db
    .select({ eventId: eventCompanies.eventId, timezone: events.timezone })
    .from(eventCompanies)
    .innerJoin(events, eq(events.id, eventCompanies.eventId))
    .where(
      and(eq(eventCompanies.id, eventCompanyId), isNull(eventCompanies.deletedAt)),
    )
    .limit(1);
  if (!ec) return { ok: false, error: "Prospect not found" };

  // Same playbook already run on this prospect in the last day → refuse.
  const [recent] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.eventCompanyId, eventCompanyId),
        like(tasks.title, `[${book.name}] %`),
        gt(tasks.createdAt, new Date(Date.now() - DAY_MS)),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  if (recent) {
    return { ok: false, error: `“${book.name}” already ran on this company today.` };
  }

  const today = todayInTimeZone(ec.timezone);
  const rows = book.steps.map((step) => ({
    id: crypto.randomUUID(),
    eventId: ec.eventId,
    eventCompanyId,
    title: playbookTaskTitle(book, step),
    dueDate: addCalendarDays(today, step.dueOffsetDays),
    priority: step.priority,
    assignedTo: session.user.id,
    createdBy: session.user.id,
  }));

  const audit = await auditRows([
    {
      userId: session.user.id,
      eventId: ec.eventId,
      action: "playbook.run",
      entityType: "event_company",
      entityId: eventCompanyId,
      changes: { playbookId, taskIds: rows.map((r) => r.id) },
    },
    ...rows.map((r) => ({
      userId: session.user.id,
      eventId: ec.eventId,
      action: "task.create",
      entityType: "task",
      entityId: r.id,
      changes: { title: r.title, eventCompanyId, playbookId },
    })),
  ]);

  await runAtomic([db.insert(tasks).values(rows), auditInsert(audit)]);

  revalidatePath("/companies");
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, data: { taskIds: rows.map((r) => r.id), playbookName: book.name } };
}

/** Undo a run: soft-delete the tasks it created (only open ones on that prospect). */
export async function undoPlaybook(raw: unknown): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();
  const parsed = undoPlaybookSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { eventCompanyId, taskIds } = parsed.data;

  const owned = await db
    .select({ id: tasks.id, eventId: tasks.eventId })
    .from(tasks)
    .where(
      and(
        inArray(tasks.id, taskIds),
        eq(tasks.eventCompanyId, eventCompanyId),
        isNull(tasks.deletedAt),
      ),
    );
  if (owned.length === 0) return { ok: true, data: { count: 0 } };
  const ids = owned.map((t) => t.id);

  const audit = await auditRows(
    owned.map((t) => ({
      userId: session.user.id,
      eventId: t.eventId,
      action: "task.delete",
      entityType: "task",
      entityId: t.id,
      changes: { reason: "playbook.undo", eventCompanyId },
    })),
  );

  await runAtomic([
    db.update(tasks).set({ deletedAt: new Date() }).where(inArray(tasks.id, ids)),
    auditInsert(audit),
  ]);

  revalidatePath("/companies");
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true, data: { count: ids.length } };
}
