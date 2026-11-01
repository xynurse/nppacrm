"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { auditInsert, auditRows, recordAudit } from "@/lib/audit";
import { instantiateBenefitsForEventCompany } from "@/lib/benefits/instantiate";
import { addCalendarDays, todayInTimeZone } from "@/lib/dates";
import { db } from "@/lib/db";
import { runAtomic } from "@/lib/db/batch";
import {
  PROSPECT_STATUS_VALUES,
  companies,
  eventCompanies,
  events,
  sponsorshipTiers,
  tasks,
} from "@/lib/db/schema";
import { changeStatus } from "@/lib/pipeline/change-status";

type ActionResult = { ok: true } | { ok: false; error: string };

const moveSchema = z.object({
  id: z.uuid(),
  status: z.enum(PROSPECT_STATUS_VALUES),
});

export async function moveEventCompanyStatus(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = moveSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const r = await changeStatus({
    id: parsed.data.id,
    to: parsed.data.status,
    actor: session.user,
    source: "kanban",
  });
  if (!r.ok) return r;

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
}

const confirmSchema = z.object({
  id: z.uuid(),
  confirmedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u, "Use a positive number, up to 2 decimals"),
  confirmedTierId: z.uuid(),
});

export async function confirmEventCompany(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const [existing] = await db
    .select({
      status: eventCompanies.status,
      eventId: eventCompanies.eventId,
    })
    .from(eventCompanies)
    .where(
      and(
        eq(eventCompanies.id, parsed.data.id),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };

  const [tier] = await db
    .select({ id: sponsorshipTiers.id })
    .from(sponsorshipTiers)
    .where(
      and(
        eq(sponsorshipTiers.id, parsed.data.confirmedTierId),
        eq(sponsorshipTiers.eventId, existing.eventId),
      ),
    )
    .limit(1);
  if (!tier) return { ok: false, error: "That tier isn't part of this event" };

  // Amount + tier first so the shared status change passes its confirm gate.
  await db
    .update(eventCompanies)
    .set({
      confirmedAmount: parsed.data.confirmedAmount,
      confirmedTierId: parsed.data.confirmedTierId,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(eventCompanies.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "eventCompany.confirm",
    entityType: "eventCompany",
    entityId: parsed.data.id,
    changes: {
      from: existing.status,
      confirmedAmount: parsed.data.confirmedAmount,
      confirmedTierId: parsed.data.confirmedTierId,
    },
  });

  const moved = await changeStatus({
    id: parsed.data.id,
    to: "confirmed",
    actor: session.user,
    source: "confirm",
  });
  if (!moved.ok) return moved;

  // Already confirmed (amount/tier edit): the status change was a no-op, so
  // top up benefits for a possibly new tier here. Idempotent either way.
  if (existing.status === "confirmed") {
    const r = await instantiateBenefitsForEventCompany({
      eventCompanyId: parsed.data.id,
      userId: session.user.id,
      tierIdOverride: parsed.data.confirmedTierId,
    });
    if (r.created > 0) {
      await recordAudit({
        userId: session.user.id,
        eventId: existing.eventId,
        action: "benefits.auto_instantiate",
        entityType: "eventCompany",
        entityId: parsed.data.id,
        changes: { created: r.created, tierId: r.tierId },
      });
    }
  }

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// markProposalSent — atomic: status → proposal_sent, URL, sent timestamp,
// optional valid-until, bump last contact, auto-create 7-day follow-up task.
// ---------------------------------------------------------------------------

const proposalSchema = z.object({
  id: z.uuid(),
  proposalUrl: z
    .string()
    .trim()
    .url("Provide a valid URL to the proposal")
    .max(2000),
  proposalValidUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD format")
    .nullable()
    .optional(),
});

export async function markProposalSent(
  raw: unknown,
): Promise<{ ok: true; followUpTaskId: string } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const [existing] = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      companyId: eventCompanies.companyId,
      ownerId: eventCompanies.ownerId,
      status: eventCompanies.status,
      timezone: events.timezone,
    })
    .from(eventCompanies)
    .innerJoin(events, eq(events.id, eventCompanies.eventId))
    .where(
      and(
        eq(eventCompanies.id, parsed.data.id),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Prospect not found" };

  // Resolve company name for the follow-up task title.
  const [companyRow] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, existing.companyId))
    .limit(1);
  const companyName = companyRow?.name ?? "this prospect";

  const now = new Date();
  const sentOn = todayInTimeZone(existing.timezone, now);
  const dueDate = addCalendarDays(sentOn, 7);
  const followUpTaskId = crypto.randomUUID();

  await runAtomic([
    db
      .update(eventCompanies)
      .set({
        proposalUrl: parsed.data.proposalUrl,
        proposalSentAt: now,
        proposalValidUntil: parsed.data.proposalValidUntil ?? null,
        lastContactedAt: now,
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(eventCompanies.id, parsed.data.id),
          isNull(eventCompanies.deletedAt),
        ),
      ),
    db.insert(tasks).values({
      id: followUpTaskId,
      eventId: existing.eventId,
      eventCompanyId: existing.id,
      title: `Follow up on ${companyName} proposal`,
      description: `Proposal sent ${sentOn}: ${parsed.data.proposalUrl}`,
      dueDate,
      priority: "medium",
      assignedTo: existing.ownerId,
      createdBy: session.user.id,
    }),
    auditInsert(
      await auditRows({
        userId: session.user.id,
        eventId: existing.eventId,
        action: "eventCompany.mark_proposal_sent",
        entityType: "eventCompany",
        entityId: parsed.data.id,
        changes: {
          from: existing.status,
          proposalUrl: parsed.data.proposalUrl,
          proposalValidUntil: parsed.data.proposalValidUntil ?? null,
          followUpTaskId,
        },
      }),
    ),
  ]);

  const moved = await changeStatus({
    id: parsed.data.id,
    to: "proposal_sent",
    actor: session.user,
    source: "proposal",
  });

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  if (!moved.ok) return moved;
  return { ok: true, followUpTaskId };
}
