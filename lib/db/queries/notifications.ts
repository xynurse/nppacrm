import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function listNotificationsForUser(
  userId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      href: notifications.href,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return rows[0]?.n ?? 0;
}
