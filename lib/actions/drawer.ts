"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  getActiveProspectus,
  listRecentJobsForEventCompany,
  listSuggestionsForEventCompany,
} from "@/lib/db/queries/ai";
import { listBenefitsForEventCompany } from "@/lib/db/queries/benefits";
import { getCompanyNotesDoc } from "@/lib/db/queries/companies";
import {
  listContactsForCompany,
  listEmailHistoryForCompany,
} from "@/lib/db/queries/contacts";
import { listInteractionsForEventCompany } from "@/lib/db/queries/interactions";
import { listTasksForEventCompany } from "@/lib/db/queries/tasks";
import { db } from "@/lib/db";
import { eventCompanies } from "@/lib/db/schema";
import type { DrawerData } from "@/components/companies/drawer-types";

/**
 * Load drawer-only data for one prospect. Kept off the list page so opening
 * `?record=` does not re-query TipTap notes / contacts / activity for every row.
 */
export async function loadCompanyDrawerData(
  raw: unknown,
): Promise<{ ok: true; data: DrawerData } | { ok: false; error: string }> {
  await requireSession();
  const parsed = z.object({ eventCompanyId: z.uuid() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [row] = await db
    .select({
      id: eventCompanies.id,
      eventId: eventCompanies.eventId,
      companyId: eventCompanies.companyId,
    })
    .from(eventCompanies)
    .where(
      and(
        eq(eventCompanies.id, parsed.data.eventCompanyId),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Prospect not found" };

  const [
    contacts,
    emailHistory,
    interactions,
    tasks,
    suggestions,
    jobs,
    prospectus,
    benefits,
    notesDoc,
  ] = await Promise.all([
    listContactsForCompany(row.companyId),
    listEmailHistoryForCompany(row.companyId),
    listInteractionsForEventCompany(row.id),
    listTasksForEventCompany(row.id),
    listSuggestionsForEventCompany(row.id),
    listRecentJobsForEventCompany(row.id, 5),
    getActiveProspectus(row.eventId),
    listBenefitsForEventCompany(row.id),
    getCompanyNotesDoc(row.companyId),
  ]);

  return {
    ok: true,
    data: {
      contacts,
      emailHistory,
      interactions,
      tasks,
      notesDoc,
      ai: {
        suggestions,
        jobs,
        hasProspectus: !!prospectus,
        prospectusFileName: prospectus?.fileName ?? null,
      },
      benefits,
    },
  };
}
