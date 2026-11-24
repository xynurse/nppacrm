import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUndefinedColumnError } from "@/lib/db/errors";
import {
  eventReviewers,
  events,
  users,
  type Event,
  type EventCourseDirector,
} from "@/lib/db/schema";

type LegacyEvent = Omit<
  Event,
  | "location"
  | "description"
  | "courseDirectors"
  | "goals"
  | "attendeeGoal"
  | "sponsorCountGoal"
>;

const legacyEventSelect = {
  id: events.id,
  name: events.name,
  slug: events.slug,
  startDate: events.startDate,
  endDate: events.endDate,
  fundraisingGoal: events.fundraisingGoal,
  currency: events.currency,
  timezone: events.timezone,
  status: events.status,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
};

function withProfileDefaults(row: LegacyEvent): Event {
  return {
    ...row,
    location: null,
    description: null,
    courseDirectors: [] as EventCourseDirector[],
    goals: [] as string[],
    attendeeGoal: null,
    sponsorCountGoal: null,
  };
}

export async function listEvents(): Promise<Event[]> {
  try {
    return await db.select().from(events).orderBy(asc(events.name));
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    const rows = await db
      .select(legacyEventSelect)
      .from(events)
      .orderBy(asc(events.name));
    return rows.map(withProfileDefaults);
  }
}

/**
 * Called by the (app) layout and nearly every page; `cache()` dedupes it to
 * one query per request.
 */
export const listActiveEvents = cache(async (): Promise<Event[]> => {
  try {
    return await db
      .select()
      .from(events)
      .where(eq(events.status, "active"))
      .orderBy(asc(events.name));
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    const rows = await db
      .select(legacyEventSelect)
      .from(events)
      .where(eq(events.status, "active"))
      .orderBy(asc(events.name));
    return rows.map(withProfileDefaults);
  }
});

export async function getEventById(id: string): Promise<Event | null> {
  try {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    return row ?? null;
  } catch (err) {
    if (!isUndefinedColumnError(err)) throw err;
    const [row] = await db
      .select(legacyEventSelect)
      .from(events)
      .where(eq(events.id, id));
    return row ? withProfileDefaults(row) : null;
  }
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
