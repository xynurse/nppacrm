import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  sponsorshipTiers,
} from "@/lib/db/schema";

export type FulfillmentRow = {
  id: string;
  companyId: string;
  companyName: string;
  confirmedAmount: string | null;
  currency: string;
  tierName: string | null;
  tierColor: string | null;
  agreementSignedAt: Date | null;
  invoiceSentAt: Date | null;
  paidAt: Date | null;
  boothNumber: string | null;
  repNames: string | null;
};

export async function listConfirmedForFulfillment(
  eventId: string,
): Promise<FulfillmentRow[]> {
  return db
    .select({
      id: eventCompanies.id,
      companyId: eventCompanies.companyId,
      companyName: companies.name,
      confirmedAmount: eventCompanies.confirmedAmount,
      currency: eventCompanies.currency,
      tierName: sponsorshipTiers.name,
      tierColor: sponsorshipTiers.color,
      agreementSignedAt: eventCompanies.agreementSignedAt,
      invoiceSentAt: eventCompanies.invoiceSentAt,
      paidAt: eventCompanies.paidAt,
      boothNumber: eventCompanies.boothNumber,
      repNames: eventCompanies.repNames,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(
      sponsorshipTiers,
      eq(sponsorshipTiers.id, eventCompanies.confirmedTierId),
    )
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        eq(eventCompanies.status, "confirmed"),
        isNull(eventCompanies.deletedAt),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name));
}
