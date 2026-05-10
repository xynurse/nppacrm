import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedViews, type SavedView } from "@/lib/db/schema";

export async function listSavedViewsForUser(
  eventId: string,
  userId: string,
  scope: "companies" = "companies",
): Promise<SavedView[]> {
  return db
    .select()
    .from(savedViews)
    .where(
      and(
        eq(savedViews.eventId, eventId),
        eq(savedViews.scope, scope),
        or(
          isNull(savedViews.ownerId),
          eq(savedViews.ownerId, userId),
          eq(savedViews.isShared, true),
        ),
      ),
    )
    .orderBy(asc(savedViews.displayOrder), asc(savedViews.name));
}

export async function getSavedView(id: string): Promise<SavedView | null> {
  const [row] = await db
    .select()
    .from(savedViews)
    .where(eq(savedViews.id, id))
    .limit(1);
  return row ?? null;
}
