import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companyBenefits,
  sponsorshipTiers,
} from "@/lib/db/schema";

export type BenefitRow = {
  id: string;
  benefitKey: string;
  label: string;
  status: typeof companyBenefits.$inferSelect.status;
  dueAt: string | null;
  note: string | null;
  defaultDueOffsetDays: number | null;
  tierId: string | null;
  tierName: string | null;
  tierColor: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
};

export async function listBenefitsForEventCompany(
  eventCompanyId: string,
): Promise<BenefitRow[]> {
  const rows = await db
    .select({
      id: companyBenefits.id,
      benefitKey: companyBenefits.benefitKey,
      label: companyBenefits.label,
      status: companyBenefits.status,
      dueAt: companyBenefits.dueAt,
      note: companyBenefits.note,
      defaultDueOffsetDays: companyBenefits.defaultDueOffsetDays,
      tierId: companyBenefits.tierId,
      tierName: sponsorshipTiers.name,
      tierColor: sponsorshipTiers.color,
      deliveredAt: companyBenefits.deliveredAt,
      createdAt: companyBenefits.createdAt,
    })
    .from(companyBenefits)
    .leftJoin(
      sponsorshipTiers,
      eq(sponsorshipTiers.id, companyBenefits.tierId),
    )
    .where(eq(companyBenefits.eventCompanyId, eventCompanyId))
    .orderBy(
      asc(companyBenefits.dueAt),
      asc(companyBenefits.label),
    );
  return rows;
}
