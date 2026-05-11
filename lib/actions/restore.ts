"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { companies, eventCompanies } from "@/lib/db/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ id: z.uuid() });

export async function restoreEventCompany(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      deletedAt: eventCompanies.deletedAt,
    })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };
  if (!existing.deletedAt) return { ok: false, error: "Not deleted" };

  const now = new Date();
  await db
    .update(eventCompanies)
    .set({ deletedAt: null, updatedAt: now, updatedBy: session.user.id })
    .where(eq(eventCompanies.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    eventId: existing.eventId,
    action: "eventCompany.restore",
    entityType: "eventCompany",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  revalidatePath("/admin/audit");
  return { ok: true };
}

export async function restoreCompany(raw: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [existing] = await db
    .select({ id: companies.id, deletedAt: companies.deletedAt })
    .from(companies)
    .where(eq(companies.id, parsed.data.id))
    .limit(1);
  if (!existing) return { ok: false, error: "Not found" };
  if (!existing.deletedAt) return { ok: false, error: "Not deleted" };

  const now = new Date();
  await db
    .update(companies)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(companies.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "company.restore",
    entityType: "company",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  revalidatePath("/admin/audit");
  return { ok: true };
}
