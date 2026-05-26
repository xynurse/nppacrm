"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { instantiateBenefitsForEventCompany } from "@/lib/actions/benefits";
import { db } from "@/lib/db";
import {
  PROSPECT_STATUS_VALUES,
  eventCompanies,
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
