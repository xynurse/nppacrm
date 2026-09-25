"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function markNotificationsRead(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = z
    .object({
      ids: z.array(z.uuid()).min(1).max(100).optional(),
      all: z.boolean().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const now = new Date();
  try {
    if (parsed.data.all) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            isNull(notifications.readAt),
          ),
        );
    } else if (parsed.data.ids) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            inArray(notifications.id, parsed.data.ids),
          ),
        );
    } else {
      return { ok: false, error: "ids or all required" };
    }
  } catch {
    return { ok: false, error: "Notifications unavailable" };
  }

  await recordAudit({
    userId: session.user.id,
    action: "notification.mark_read",
    entityType: "notification",
    entityId: parsed.data.all ? "all" : (parsed.data.ids?.[0] ?? ""),
    changes: parsed.data,
  });

  revalidatePath("/");
  return { ok: true };
}
