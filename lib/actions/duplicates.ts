"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { runAtomic } from "@/lib/db/batch";
import { db } from "@/lib/db";
import {
  companies,
  companyTags,
  contacts,
  eventCompanies,
} from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

const mergeSchema = z.object({
  survivorId: z.uuid(),
  loserId: z.uuid(),
});

/**
 * Merge loser company into survivor:
 * - Move contacts (skip email/name dupes)
 * - Move company tags (on conflict skip)
 * - For each event: if only loser has a row, re-point it; if both exist, soft-delete
 *   the loser row (survivor keeps the book)
 * - Soft-delete the loser company
 */
export async function mergeCompanies(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = mergeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { survivorId, loserId } = parsed.data;
  if (survivorId === loserId) {
    return { ok: false, error: "Pick two different companies" };
  }

  const [survivor, loser] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(and(eq(companies.id, survivorId), isNull(companies.deletedAt)))
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(companies)
      .where(and(eq(companies.id, loserId), isNull(companies.deletedAt)))
      .then((r) => r[0] ?? null),
  ]);
  if (!survivor || !loser) {
    return { ok: false, error: "Company not found" };
  }

  const [survivorContacts, loserContacts, loserTags, survivorEcs, loserEcs] =
    await Promise.all([
      db
        .select()
        .from(contacts)
        .where(and(eq(contacts.companyId, survivorId), isNull(contacts.deletedAt))),
      db
        .select()
        .from(contacts)
        .where(and(eq(contacts.companyId, loserId), isNull(contacts.deletedAt))),
      db
        .select()
        .from(companyTags)
        .where(eq(companyTags.companyId, loserId)),
      db
        .select()
        .from(eventCompanies)
        .where(
          and(
            eq(eventCompanies.companyId, survivorId),
            isNull(eventCompanies.deletedAt),
          ),
        ),
      db
        .select()
        .from(eventCompanies)
        .where(
          and(
            eq(eventCompanies.companyId, loserId),
            isNull(eventCompanies.deletedAt),
          ),
        ),
    ]);

  const survivorContactKeys = new Set(
    survivorContacts.map((c) =>
      (c.email ?? c.fullName).toLowerCase(),
    ),
  );

  const contactMoves = loserContacts.filter((c) => {
    const key = (c.email ?? c.fullName).toLowerCase();
    if (survivorContactKeys.has(key)) return false;
    survivorContactKeys.add(key);
    return true;
  });
  const contactSoftDeletes = loserContacts.filter(
    (c) => !contactMoves.some((m) => m.id === c.id),
  );

  const survivorEvents = new Set(survivorEcs.map((e) => e.eventId));
  const ecsToRepoint = loserEcs.filter((e) => !survivorEvents.has(e.eventId));
  const ecsToSoftDelete = loserEcs.filter((e) => survivorEvents.has(e.eventId));

  const now = new Date();
  const statements = [
    ...contactMoves.map((c) =>
      db
        .update(contacts)
        .set({ companyId: survivorId, updatedAt: now })
        .where(eq(contacts.id, c.id)),
    ),
    contactSoftDeletes.length > 0
      ? db
          .update(contacts)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            inArray(
              contacts.id,
              contactSoftDeletes.map((c) => c.id),
            ),
          )
      : null,
    ...loserTags.map((t) =>
      db
        .insert(companyTags)
        .values({ companyId: survivorId, tagId: t.tagId })
        .onConflictDoNothing(),
    ),
    ...ecsToRepoint.map((e) =>
      db
        .update(eventCompanies)
        .set({ companyId: survivorId, updatedAt: now, updatedBy: session.user.id })
        .where(eq(eventCompanies.id, e.id)),
    ),
    ecsToSoftDelete.length > 0
      ? db
          .update(eventCompanies)
          .set({
            deletedAt: now,
            updatedAt: now,
            updatedBy: session.user.id,
          })
          .where(
            inArray(
              eventCompanies.id,
              ecsToSoftDelete.map((e) => e.id),
            ),
          )
      : null,
    db
      .update(companies)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(companies.id, loserId)),
    // Fill blank survivor website from loser when helpful.
    !survivor.website && loser.website
      ? db
          .update(companies)
          .set({ website: loser.website, updatedAt: now })
          .where(eq(companies.id, survivorId))
      : null,
  ];

  await runAtomic(statements);

  await recordAudit({
    userId: session.user.id,
    eventId: null,
    action: "company.merge",
    entityType: "company",
    entityId: survivorId,
    changes: {
      survivorId,
      loserId,
      survivorName: survivor.name,
      loserName: loser.name,
      contactsMoved: contactMoves.length,
      contactsSoftDeleted: contactSoftDeletes.length,
      eventRowsRepointed: ecsToRepoint.length,
      eventRowsSoftDeleted: ecsToSoftDelete.length,
    },
  });

  revalidatePath("/admin/duplicates");
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/", "layout");
  return { ok: true };
}
