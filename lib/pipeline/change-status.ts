import { and, inArray, isNull } from "drizzle-orm";
import { recordAuditMany } from "@/lib/audit";
import { instantiateBenefitsForEventCompany } from "@/lib/benefits/instantiate";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  type ProspectStatus,
} from "@/lib/db/schema";
import { createNotifications } from "@/lib/notifications";

// The single path for changing a prospect's status. Kanban, inline cells,
// bulk edits, the confirm modal and "proposal sent" all go through here so
// every change gets the same confirm gate, `eventCompany.move_status` audit
// row (which days-in-stage reads), owner notification and benefits.
//
// Not a "use server" module: callers are server actions that have already
// authenticated, and every export here would otherwise be browser-callable.

type Actor = { id: string; name?: string | null };

export type SkipReason = "not_found" | "needs_amount_and_tier";

export type ChangeStatusResult = {
  updated: string[];
  unchanged: string[];
  skipped: { id: string; reason: SkipReason }[];
};

export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
  not_found: "Prospect not found",
  needs_amount_and_tier:
    "Set confirmed amount and tier before moving to Confirmed.",
};

export async function changeStatuses(opts: {
  ids: string[];
  to: ProspectStatus;
  actor: Actor;
  /** Audit hint for where the change came from (kanban, cell, bulk, …). */
  source: string;
}): Promise<ChangeStatusResult> {
  const { to, actor, source } = opts;
  const ids = [...new Set(opts.ids)];
  const result: ChangeStatusResult = { updated: [], unchanged: [], skipped: [] };
  if (ids.length === 0) return result;

  const rows = await db
    .select({
      id: eventCompanies.id,
      status: eventCompanies.status,
      eventId: eventCompanies.eventId,
      ownerId: eventCompanies.ownerId,
      companyId: eventCompanies.companyId,
      confirmedAmount: eventCompanies.confirmedAmount,
      confirmedTierId: eventCompanies.confirmedTierId,
    })
    .from(eventCompanies)
    .where(
      and(inArray(eventCompanies.id, ids), isNull(eventCompanies.deletedAt)),
    );

  const byId = new Map(rows.map((r) => [r.id, r]));
  const eligible: typeof rows = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      result.skipped.push({ id, reason: "not_found" });
    } else if (row.status === to) {
      result.unchanged.push(id);
    } else if (
      to === "confirmed" &&
      (!row.confirmedAmount || !row.confirmedTierId)
    ) {
      result.skipped.push({ id, reason: "needs_amount_and_tier" });
    } else {
      eligible.push(row);
    }
  }
  if (eligible.length === 0) return result;

  const eligibleIds = eligible.map((r) => r.id);
  await db
    .update(eventCompanies)
    .set({ status: to, updatedAt: new Date(), updatedBy: actor.id })
    .where(
      and(
        inArray(eventCompanies.id, eligibleIds),
        isNull(eventCompanies.deletedAt),
      ),
    );
  result.updated = eligibleIds;

  await recordAuditMany(
    eligible.map((r) => ({
      userId: actor.id,
      eventId: r.eventId,
      action: "eventCompany.move_status",
      entityType: "eventCompany",
      entityId: r.id,
      changes: { from: r.status, to, source },
    })),
  );

  await notifyOwners(eligible, to, actor);

  if (to === "confirmed") {
    const benefitAudits = [];
    for (const r of eligible) {
      const b = await instantiateBenefitsForEventCompany({
        eventCompanyId: r.id,
        userId: actor.id,
      });
      if (b.created > 0) {
        benefitAudits.push({
          userId: actor.id,
          eventId: r.eventId,
          action: "benefits.auto_instantiate",
          entityType: "eventCompany",
          entityId: r.id,
          changes: { created: b.created, tierId: b.tierId },
        });
      }
    }
    await recordAuditMany(benefitAudits);
  }

  return result;
}

/** Single-prospect convenience: an error string when it couldn't be moved. */
export async function changeStatus(opts: {
  id: string;
  to: ProspectStatus;
  actor: Actor;
  source: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await changeStatuses({ ...opts, ids: [opts.id] });
  const skip = r.skipped[0];
  return skip ? { ok: false, error: SKIP_REASON_TEXT[skip.reason] } : { ok: true };
}

async function notifyOwners(
  rows: { id: string; ownerId: string | null; companyId: string }[],
  to: ProspectStatus,
  actor: Actor,
) {
  const targets = rows.filter((r) => r.ownerId && r.ownerId !== actor.id);
  if (targets.length === 0) return;

  const names = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(inArray(companies.id, [...new Set(targets.map((r) => r.companyId))]));
  const nameById = new Map(names.map((c) => [c.id, c.name]));

  await createNotifications(
    targets.map((r) => ({
      userId: r.ownerId!,
      type: "status_change",
      title: `${nameById.get(r.companyId) ?? "A prospect"} → ${to.replace(/_/g, " ")}`,
      body: actor.name
        ? `Updated by ${actor.name}`
        : "Status changed on a company you own",
      entityType: "eventCompany",
      entityId: r.id,
      href: `/companies?record=${r.id}`,
    })),
  );
}
