import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companyBenefits,
  eventCompanies,
  events,
  sponsorshipTiers,
} from "@/lib/db/schema";

// Lives outside lib/actions on purpose: every export of a "use server" file
// is callable from the browser, and this helper does no auth check of its own.
// Callers (server actions) must authenticate first.
// ---------------------------------------------------------------------------
// Core helper — callable from confirm paths, not just from a UI button.
// Idempotent: skips benefits whose (event_company_id, benefit_key) already exist.
// Returns { created, skipped } counts. Safe to call multiple times.
// ---------------------------------------------------------------------------

export async function instantiateBenefitsForEventCompany(opts: {
  eventCompanyId: string;
  userId: string | null;
  /** Optional override tier; if omitted, uses ec.confirmedTierId. */
  tierIdOverride?: string;
}): Promise<{ created: number; skipped: number; tierId: string | null }> {
  const [ec] = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      confirmedTierId: eventCompanies.confirmedTierId,
    })
    .from(eventCompanies)
    .where(eq(eventCompanies.id, opts.eventCompanyId))
    .limit(1);
  if (!ec) return { created: 0, skipped: 0, tierId: null };

  const tierId = opts.tierIdOverride ?? ec.confirmedTierId;
  if (!tierId) return { created: 0, skipped: 0, tierId: null };

  const [tier] = await db
    .select({
      id: sponsorshipTiers.id,
      benefits: sponsorshipTiers.benefits,
    })
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.id, tierId))
    .limit(1);
  if (!tier || tier.benefits.length === 0) {
    return { created: 0, skipped: 0, tierId };
  }

  const [eventRow] = await db
    .select({ startDate: events.startDate })
    .from(events)
    .where(eq(events.id, ec.eventId))
    .limit(1);
  const eventStart = eventRow?.startDate
    ? new Date(`${eventRow.startDate}T00:00:00Z`)
    : null;

  // Fetch existing rows so we can skip duplicates by benefit_key.
  const existing = await db
    .select({ benefitKey: companyBenefits.benefitKey })
    .from(companyBenefits)
    .where(eq(companyBenefits.eventCompanyId, opts.eventCompanyId));
  const have = new Set(existing.map((r) => r.benefitKey));

  const toInsert = tier.benefits
    .filter((b) => !have.has(b.key))
    .map((b) => {
      const due =
        eventStart && b.defaultDueOffsetDays !== undefined
          ? new Date(
              eventStart.getTime() + b.defaultDueOffsetDays * 86_400_000,
            )
          : null;
      return {
        eventCompanyId: opts.eventCompanyId,
        tierId,
        benefitKey: b.key,
        label: b.label,
        status: "pending" as const,
        dueAt: due ? due.toISOString().slice(0, 10) : null,
        defaultDueOffsetDays: b.defaultDueOffsetDays ?? null,
        createdBy: opts.userId,
      };
    });

  if (toInsert.length === 0) {
    return { created: 0, skipped: tier.benefits.length, tierId };
  }

  await db.insert(companyBenefits).values(toInsert);

  return {
    created: toInsert.length,
    skipped: tier.benefits.length - toInsert.length,
    tierId,
  };
}
