"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { instantiateBenefitsForEventCompany } from "@/lib/actions/benefits";
import { db } from "@/lib/db";
import {
  PROSPECT_STATUS_VALUES,
  companies,
  eventCompanies,
  tasks,
} from "@/lib/db/schema";

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

  const [existing] = await db
    .select({
      status: eventCompanies.status,
      eventId: eventCompanies.eventId,
      confirmedAmount: eventCompanies.confirmedAmount,
      confirmedTierId: eventCompanies.confirmedTierId,
    })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };

  if (parsed.data.status === "confirmed") {
    if (!existing.confirmedAmount || !existing.confirmedTierId) {
      return {
        ok: false,
        error: "Set confirmed amount and tier before moving to Confirmed.",
      };
    }
  }

  await db
    .update(eventCompanies)
    .set({
      status: parsed.data.status,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    })
    .where(eq(eventCompanies.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "eventCompany.move_status",
    entityType: "eventCompany",
    entityId: parsed.data.id,
    changes: { from: existing.status, to: parsed.data.status },
  });

  // Auto-instantiate benefits when we just moved into confirmed.
  if (parsed.data.status === "confirmed" && existing.status !== "confirmed") {
    const r = await instantiateBenefitsForEventCompany({
      eventCompanyId: parsed.data.id,
      userId: session.user.id,
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
    .where(eq(eventCompanies.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };

  await db
    .update(eventCompanies)
    .set({
      status: "confirmed",
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
    })
    .from(eventCompanies)
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

  await db
    .update(eventCompanies)
    .set({
      status: "proposal_sent",
      proposalUrl: parsed.data.proposalUrl,
      proposalSentAt: now,
      proposalValidUntil: parsed.data.proposalValidUntil ?? null,
      lastContactedAt: now,
      updatedAt: now,
      updatedBy: session.user.id,
    })
    .where(eq(eventCompanies.id, parsed.data.id));

  // 7-day follow-up due date as YYYY-MM-DD.
  const dueDate = new Date(now.getTime() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [createdTask] = await db
    .insert(tasks)
    .values({
      eventId: existing.eventId,
      eventCompanyId: existing.id,
      title: `Follow up on ${companyName} proposal`,
      description: `Proposal sent ${now.toISOString().slice(0, 10)}: ${parsed.data.proposalUrl}`,
      dueDate,
      priority: "medium",
      assignedTo: existing.ownerId,
      createdBy: session.user.id,
    })
    .returning({ id: tasks.id });

  if (!createdTask) {
    // We don't roll back the proposal update — the data is still useful.
    return { ok: false, error: "Saved proposal but failed to create follow-up task" };
  }

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "eventCompany.mark_proposal_sent",
    entityType: "eventCompany",
    entityId: parsed.data.id,
    changes: {
      from: existing.status,
      proposalUrl: parsed.data.proposalUrl,
      proposalValidUntil: parsed.data.proposalValidUntil ?? null,
      followUpTaskId: createdTask.id,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  return { ok: true, followUpTaskId: createdTask.id };
}
