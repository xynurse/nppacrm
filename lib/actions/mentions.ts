"use server";

import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type MentionUser = { id: string; label: string };

/**
 * Active users that can be `@`-mentioned in a rich-text note.
 *
 * The mention extension calls this once when the editor first needs it and
 * filters the (small) result client-side, so there is no per-keystroke round
 * trip. Read-only, so no audit row. The returned `id` is the user id and is
 * stored in the mention node's attrs — Chunk 20 resolves notifications from it,
 * which is why we key on the id and never the display name.
 */
export async function listMentionUsers(): Promise<MentionUser[]> {
  await requireSession();

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));

  return rows.map((u) => ({ id: u.id, label: u.name.trim() || u.email }));
}
