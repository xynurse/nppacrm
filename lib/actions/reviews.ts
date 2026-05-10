"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  REVIEW_VOTE_VALUES,
  eventCompanies,
  eventCompanyReviews,
  eventReviewers,
} from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

const setVoteSchema = z.object({
  eventCompanyId: z.uuid(),
  vote: z.union([z.enum(REVIEW_VOTE_VALUES), z.null()]),
});

export async function setReviewVote(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = setVoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [ec] = await db
    .select({ eventId: eventCompanies.eventId })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.eventCompanyId))
    .limit(1);
  if (!ec) return { ok: false, error: "Prospect not found" };

  const [reviewerRow] = await db
    .select({ userId: eventReviewers.userId })
    .from(eventReviewers)
    .where(
      and(
        eq(eventReviewers.eventId, ec.eventId),
        eq(eventReviewers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!reviewerRow) {
    return {
      ok: false,
      error: "You are not a reviewer for this event",
    };
  }

  if (parsed.data.vote === null) {
    await db
      .delete(eventCompanyReviews)
      .where(
        and(
          eq(eventCompanyReviews.eventCompanyId, parsed.data.eventCompanyId),
          eq(eventCompanyReviews.reviewerId, session.user.id),
        ),
      );
  } else {
    await db
      .insert(eventCompanyReviews)
      .values({
        eventCompanyId: parsed.data.eventCompanyId,
        reviewerId: session.user.id,
        vote: parsed.data.vote,
      })
      .onConflictDoUpdate({
        target: [
          eventCompanyReviews.eventCompanyId,
          eventCompanyReviews.reviewerId,
        ],
        set: { vote: parsed.data.vote, updatedAt: new Date() },
      });
  }

  await recordAudit({
    userId: session.user.id,
    eventId: ec.eventId,
    action: "review.vote",
    entityType: "eventCompany",
    entityId: parsed.data.eventCompanyId,
    changes: { vote: parsed.data.vote },
  });

  revalidatePath("/companies");
  return { ok: true };
}
