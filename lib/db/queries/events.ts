import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventReviewers, events, users } from "@/lib/db/schema";

export async function listEvents() {
  return db.select().from(events).orderBy(asc(events.name));
}

export async function listActiveEvents() {
  return db
    .select()
    .from(events)
    .where(eq(events.status, "active"))
    .orderBy(asc(events.name));
}

export async function getEventById(id: string) {
  const [row] = await db.select().from(events).where(eq(events.id, id));
  return row ?? null;
}

export async function listReviewersForEvent(eventId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
    .from(eventReviewers)
    .innerJoin(users, eq(users.id, eventReviewers.userId))
    .where(eq(eventReviewers.eventId, eventId))
    .orderBy(asc(users.name));
}
