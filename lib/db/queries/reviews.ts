import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  eventCompanies,
  eventCompanyReviews,
  eventReviewers,
} from "@/lib/db/schema";

export type ReviewRow = {
  eventCompanyId: string;
  reviewerId: string;
  vote: typeof eventCompanyReviews.$inferSelect.vote;
  note: string | null;
};

export async function listReviewsForEvent(
  eventId: string,
): Promise<ReviewRow[]> {
  const ecRows = await db
    .select({ id: eventCompanies.id })
    .from(eventCompanies)
    .where(eq(eventCompanies.eventId, eventId));
  const ids = ecRows.map((r) => r.id);
  if (ids.length === 0) return [];
  return db
    .select({
      eventCompanyId: eventCompanyReviews.eventCompanyId,
      reviewerId: eventCompanyReviews.reviewerId,
      vote: eventCompanyReviews.vote,
      note: eventCompanyReviews.note,
    })
    .from(eventCompanyReviews)
    .where(inArray(eventCompanyReviews.eventCompanyId, ids));
}

export async function listReviewerIdsForEvent(
  eventId: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: eventReviewers.userId })
    .from(eventReviewers)
    .where(eq(eventReviewers.eventId, eventId));
  return rows.map((r) => r.userId);
}
