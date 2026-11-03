"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { updateSession } from "@/auth";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { runAtomic } from "@/lib/db/batch";
import { db } from "@/lib/db";
import {
  customFieldDefinitions,
  eventCompanies,
  eventReviewers,
  events,
  sponsorshipTiers,
  type ProspectStatus,
} from "@/lib/db/schema";
import {
  createEventSchema,
  rolloverEventSchema,
  setActiveEventSchema,
  updateEventSchema,
} from "@/lib/schemas/events";

type ActionResult = { ok: true } | { ok: false; error: string };

type RolloverResult =
  | {
      ok: true;
      eventId: string;
      counts: {
        tiers: number;
        fields: number;
        reviewers: number;
        companies: number;
        renewals: number;
      };
    }
  | { ok: false; error: string };

const ROLLOVER_CHUNK = 100;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function createEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = createEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { name, slug, startDate, endDate, fundraisingGoal, currency, timezone } =
    parsed.data;

  const [created] = await db
    .insert(events)
    .values({
      name,
      slug,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      fundraisingGoal: fundraisingGoal ?? null,
      currency,
      timezone,
    })
    .returning();

  if (!created) {
    return { ok: false, error: "Failed to create event" };
  }

  await recordAudit({
    userId: session.user.id,
    eventId: created.id,
    action: "event.create",
    entityType: "event",
    entityId: created.id,
    changes: { name, slug },
  });

  revalidatePath("/admin/events");
  return { ok: true };
}

export async function updateEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { id, ...rest } = parsed.data;
  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
  if (rest.name !== undefined) updates.name = rest.name;
  if (rest.slug !== undefined) updates.slug = rest.slug;
  if (rest.startDate !== undefined) updates.startDate = rest.startDate ?? null;
  if (rest.endDate !== undefined) updates.endDate = rest.endDate ?? null;
  if (rest.fundraisingGoal !== undefined)
    updates.fundraisingGoal = rest.fundraisingGoal ?? null;
  if (rest.currency !== undefined) updates.currency = rest.currency;
  if (rest.timezone !== undefined) updates.timezone = rest.timezone;
  if (rest.status !== undefined) updates.status = rest.status;

  await db.update(events).set(updates).where(eq(events.id, id));

  await recordAudit({
    userId: session.user.id,
    eventId: id,
    action: "event.update",
    entityType: "event",
    entityId: id,
    changes: rest,
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function setActiveEvent(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = setActiveEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid event" };
  }

  await updateSession({
    user: { activeEventId: parsed.data.eventId },
  });

  await recordAudit({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    action: "event.set_active",
    entityType: "user",
    entityId: session.user.id,
    changes: { activeEventId: parsed.data.eventId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addReviewer(input: {
  eventId: string;
  userId: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  await db
    .insert(eventReviewers)
    .values(input)
    .onConflictDoNothing({
      target: [eventReviewers.eventId, eventReviewers.userId],
    });

  await recordAudit({
    userId: session.user.id,
    eventId: input.eventId,
    action: "event.reviewer_add",
    entityType: "event_reviewer",
    entityId: `${input.eventId}:${input.userId}`,
    changes: input,
  });

  revalidatePath(`/admin/events/${input.eventId}`);
  return { ok: true };
}

export async function removeReviewer(input: {
  eventId: string;
  userId: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  await db
    .delete(eventReviewers)
    .where(
      and(
        eq(eventReviewers.eventId, input.eventId),
        eq(eventReviewers.userId, input.userId),
      ),
    );

  await recordAudit({
    userId: session.user.id,
    eventId: input.eventId,
    action: "event.reviewer_remove",
    entityType: "event_reviewer",
    entityId: `${input.eventId}:${input.userId}`,
    changes: input,
  });

  revalidatePath(`/admin/events/${input.eventId}`);
  return { ok: true };
}

/**
 * Start next year's event from an existing one: copy tiers, custom fields,
 * reviewers, and selected companies. Confirmed sponsors land as `past_sponsor`
 * (renewal targets). Pipeline rows reset to `prospect`. Year-specific data
 * (tasks, interactions, benefits, proposals, fulfillment) is not copied.
 */
export async function rolloverEvent(raw: unknown): Promise<RolloverResult> {
  const session = await requireAdmin();
  const parsed = rolloverEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const {
    sourceEventId,
    name,
    slug,
    startDate,
    endDate,
    fundraisingGoal,
    currency,
    timezone,
    includeConfirmed,
    includePastSponsors,
    includePipeline,
    includeDeclined,
    archiveSource,
  } = parsed.data;

  const source = await db
    .select()
    .from(events)
    .where(eq(events.id, sourceEventId))
    .then((rows) => rows[0] ?? null);
  if (!source) {
    return { ok: false, error: "Source event not found" };
  }

  const slugTaken = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, slug))
    .then((rows) => rows[0]);
  if (slugTaken) {
    return { ok: false, error: `Slug "${slug}" is already in use` };
  }

  const [sourceTiers, sourceFields, sourceReviewers, sourceRows] =
    await Promise.all([
      db
        .select()
        .from(sponsorshipTiers)
        .where(eq(sponsorshipTiers.eventId, sourceEventId)),
      db
        .select()
        .from(customFieldDefinitions)
        .where(eq(customFieldDefinitions.eventId, sourceEventId)),
      db
        .select()
        .from(eventReviewers)
        .where(eq(eventReviewers.eventId, sourceEventId)),
      db
        .select()
        .from(eventCompanies)
        .where(
          and(
            eq(eventCompanies.eventId, sourceEventId),
            isNull(eventCompanies.deletedAt),
          ),
        ),
    ]);

  const newEventId = crypto.randomUUID();
  const tierIdMap = new Map<string, string>();
  for (const tier of sourceTiers) {
    tierIdMap.set(tier.id, crypto.randomUUID());
  }

  const remapTier = (id: string | null): string | null => {
    if (!id) return null;
    return tierIdMap.get(id) ?? null;
  };

  const shouldInclude = (status: ProspectStatus): boolean => {
    if (status === "confirmed") return includeConfirmed;
    if (status === "past_sponsor") return includePastSponsors;
    if (status === "declined") return includeDeclined;
    return includePipeline;
  };

  const newEventCompanies: Array<typeof eventCompanies.$inferInsert> = [];
  let renewals = 0;

  for (const row of sourceRows) {
    if (!shouldInclude(row.status)) continue;

    const isRenewal =
      row.status === "confirmed" || row.status === "past_sponsor";
    if (isRenewal) renewals += 1;

    const nextStatus: ProspectStatus = isRenewal
      ? "past_sponsor"
      : row.status === "declined"
        ? "declined"
        : "prospect";

    const priorTier =
      remapTier(row.confirmedTierId) ?? remapTier(row.targetTierId);

    newEventCompanies.push({
      id: crypto.randomUUID(),
      eventId: newEventId,
      companyId: row.companyId,
      status: nextStatus,
      priority: row.priority,
      ownerId: row.ownerId,
      targetTierId: priorTier,
      confirmedTierId: null,
      proposedAmount: isRenewal
        ? (row.confirmedAmount ?? row.proposedAmount)
        : row.proposedAmount,
      confirmedAmount: null,
      currency: row.currency,
      nextActionAt: null,
      firstContactedAt: null,
      lastContactedAt: null,
      proposalUrl: null,
      proposalSentAt: null,
      proposalValidUntil: null,
      whyTheyShouldAttend: row.whyTheyShouldAttend,
      keyTalkingPoints: row.keyTalkingPoints,
      emailAngle: row.emailAngle,
      sponsorshipHook: row.sponsorshipHook,
      companyContext: row.companyContext,
      relationshipNotes: row.relationshipNotes,
      contactSourceNotes: row.contactSourceNotes,
      agreementSignedAt: null,
      invoiceSentAt: null,
      paidAt: null,
      boothNumber: null,
      repNames: null,
      customFields: row.customFields,
      tagsCache: row.tagsCache,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });
  }

  const statements = [
    db.insert(events).values({
      id: newEventId,
      name,
      slug,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      fundraisingGoal: fundraisingGoal ?? null,
      currency,
      timezone,
      status: "active",
    }),
    sourceTiers.length > 0
      ? db.insert(sponsorshipTiers).values(
          sourceTiers.map((tier) => ({
            id: tierIdMap.get(tier.id)!,
            eventId: newEventId,
            name: tier.name,
            color: tier.color,
            displayOrder: tier.displayOrder,
            suggestedAmount: tier.suggestedAmount,
            benefits: tier.benefits,
          })),
        )
      : null,
    sourceFields.length > 0
      ? db.insert(customFieldDefinitions).values(
          sourceFields.map((field) => ({
            id: crypto.randomUUID(),
            eventId: newEventId,
            entityType: field.entityType,
            key: field.key,
            label: field.label,
            fieldType: field.fieldType,
            config: field.config,
            isRequired: field.isRequired,
            displayOrder: field.displayOrder,
          })),
        )
      : null,
    sourceReviewers.length > 0
      ? db.insert(eventReviewers).values(
          sourceReviewers.map((r) => ({
            eventId: newEventId,
            userId: r.userId,
          })),
        )
      : null,
    ...chunks(newEventCompanies, ROLLOVER_CHUNK).map((chunk) =>
      db.insert(eventCompanies).values(chunk),
    ),
    archiveSource
      ? db
          .update(events)
          .set({ status: "archived", updatedAt: new Date() })
          .where(eq(events.id, sourceEventId))
      : null,
  ];

  await runAtomic(statements);

  await recordAudit({
    userId: session.user.id,
    eventId: newEventId,
    action: "event.rollover",
    entityType: "event",
    entityId: newEventId,
    changes: {
      sourceEventId,
      name,
      slug,
      includeConfirmed,
      includePastSponsors,
      includePipeline,
      includeDeclined,
      archiveSource,
      counts: {
        tiers: sourceTiers.length,
        fields: sourceFields.length,
        reviewers: sourceReviewers.length,
        companies: newEventCompanies.length,
        renewals,
      },
    },
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${sourceEventId}`);
  revalidatePath(`/admin/events/${newEventId}`);
  revalidatePath("/", "layout");

  return {
    ok: true,
    eventId: newEventId,
    counts: {
      tiers: sourceTiers.length,
      fields: sourceFields.length,
      reviewers: sourceReviewers.length,
      companies: newEventCompanies.length,
      renewals,
    },
  };
}
