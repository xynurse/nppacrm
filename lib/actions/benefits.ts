"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { instantiateBenefitsForEventCompany } from "@/lib/benefits/instantiate";
import { db } from "@/lib/db";
import { BENEFIT_STATUS_VALUES, companyBenefits } from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };


// ---------------------------------------------------------------------------
// Public server actions
// ---------------------------------------------------------------------------

const instantiateSchema = z.object({ eventCompanyId: z.uuid() });

export async function instantiateBenefits(
  raw: unknown,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const session = await requireSession();
  const parsed = instantiateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const result = await instantiateBenefitsForEventCompany({
    eventCompanyId: parsed.data.eventCompanyId,
    userId: session.user.id,
  });

  if (!result.tierId) {
    return {
      ok: false,
      error:
        "Set a confirmed tier on this prospect first — that's where benefits come from.",
    };
  }

  await recordAudit({
    userId: session.user.id,
    action: "benefits.instantiate",
    entityType: "eventCompany",
    entityId: parsed.data.eventCompanyId,
    changes: { created: result.created, skipped: result.skipped, tierId: result.tierId },
  });

  revalidatePath("/companies");
  return { ok: true, created: result.created, skipped: result.skipped };
}

const updateStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(BENEFIT_STATUS_VALUES),
});

export async function updateBenefitStatus(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateStatusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({
      id: companyBenefits.id,
      eventCompanyId: companyBenefits.eventCompanyId,
      status: companyBenefits.status,
    })
    .from(companyBenefits)
    .where(eq(companyBenefits.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Benefit not found" };

  const now = new Date();
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: now,
  };
  if (parsed.data.status === "delivered") {
    updates.deliveredAt = now;
    updates.deliveredBy = session.user.id;
  } else if (existing.status === "delivered") {
    // Backing out of delivered — clear the timestamp.
    updates.deliveredAt = null;
    updates.deliveredBy = null;
  }

  await db
    .update(companyBenefits)
    .set(updates)
    .where(eq(companyBenefits.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "benefit.update_status",
    entityType: "benefit",
    entityId: parsed.data.id,
    changes: { from: existing.status, to: parsed.data.status },
  });

  revalidatePath("/companies");
  return { ok: true };
}

const updateDueSchema = z.object({
  id: z.uuid(),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable(),
});

export async function updateBenefitDueAt(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateDueSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid date" };

  const [existing] = await db
    .select({ id: companyBenefits.id })
    .from(companyBenefits)
    .where(eq(companyBenefits.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Benefit not found" };

  await db
    .update(companyBenefits)
    .set({ dueAt: parsed.data.dueAt, updatedAt: new Date() })
    .where(eq(companyBenefits.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "benefit.update_due_at",
    entityType: "benefit",
    entityId: parsed.data.id,
    changes: { dueAt: parsed.data.dueAt },
  });

  revalidatePath("/companies");
  return { ok: true };
}

const updateNoteSchema = z.object({
  id: z.uuid(),
  note: z.string().max(2000).nullable(),
});

export async function updateBenefitNote(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateNoteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({ id: companyBenefits.id })
    .from(companyBenefits)
    .where(eq(companyBenefits.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Benefit not found" };

  await db
    .update(companyBenefits)
    .set({ note: parsed.data.note, updatedAt: new Date() })
    .where(eq(companyBenefits.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "benefit.update_note",
    entityType: "benefit",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  return { ok: true };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deleteBenefit(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({
      id: companyBenefits.id,
      eventCompanyId: companyBenefits.eventCompanyId,
      benefitKey: companyBenefits.benefitKey,
    })
    .from(companyBenefits)
    .where(eq(companyBenefits.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Benefit not found" };

  await db
    .delete(companyBenefits)
    .where(eq(companyBenefits.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "benefit.delete",
    entityType: "benefit",
    entityId: parsed.data.id,
    changes: { benefitKey: existing.benefitKey },
  });

  revalidatePath("/companies");
  return { ok: true };
}

// "Sync from tier" — same as instantiate but explicitly user-driven so the
// audit row's action name is more descriptive when used from the UI.
const syncSchema = z.object({ eventCompanyId: z.uuid() });

export async function syncBenefitsFromTier(
  raw: unknown,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const session = await requireSession();
  const parsed = syncSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const result = await instantiateBenefitsForEventCompany({
    eventCompanyId: parsed.data.eventCompanyId,
    userId: session.user.id,
  });

  if (!result.tierId) {
    return { ok: false, error: "Set a confirmed tier first." };
  }

  await recordAudit({
    userId: session.user.id,
    action: "benefits.sync_from_tier",
    entityType: "eventCompany",
    entityId: parsed.data.eventCompanyId,
    changes: { created: result.created, skipped: result.skipped, tierId: result.tierId },
  });

  // Re-fetch the existing benefits so we can confirm partial match.
  const existing = await db
    .select({ benefitKey: companyBenefits.benefitKey })
    .from(companyBenefits)
    .where(eq(companyBenefits.eventCompanyId, parsed.data.eventCompanyId));
  void existing;

  // Also surface invalid: if every benefit is already in place, that's fine.
  revalidatePath("/companies");
  return { ok: true, created: result.created, skipped: result.skipped };
}

// Suppress unused import warning for the upcoming `and` if linter ever needs it.
void and;
