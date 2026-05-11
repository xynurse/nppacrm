import { and, asc, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  interactions,
  tasks,
  users,
} from "@/lib/db/schema";

export type StalledRow = {
  id: string;
  companyName: string;
  status: typeof eventCompanies.$inferSelect.status;
  lastContactedAt: Date | null;
  ownerName: string | null;
};

export type ActivityRow = {
  id: string;
  type: typeof interactions.$inferSelect.type;
  subject: string | null;
  occurredAt: Date;
  companyName: string;
  eventCompanyId: string;
  userName: string | null;
};

export type DashboardMetrics = {
  totalProspects: number;
  confirmedCount: number;
  confirmedAmount: number;
  proposedAmount: number;
  byStatus: Record<string, number>;
  fundraisingGoal: string | null;
};

const STALE_DAYS = 30;
const ACTIVE_STATUSES = [
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
];

export async function getDashboardMetrics(
  eventId: string,
): Promise<DashboardMetrics> {
  const rows = await db
    .select({
      status: eventCompanies.status,
      proposedAmount: eventCompanies.proposedAmount,
      confirmedAmount: eventCompanies.confirmedAmount,
    })
    .from(eventCompanies)
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
      ),
    );

  let totalProspects = 0;
  let confirmedCount = 0;
  let confirmedAmount = 0;
  let proposedAmount = 0;
  const byStatus: Record<string, number> = {};

  for (const r of rows) {
    totalProspects += 1;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "confirmed") {
      confirmedCount += 1;
      if (r.confirmedAmount) confirmedAmount += Number(r.confirmedAmount);
    }
    if (r.proposedAmount) proposedAmount += Number(r.proposedAmount);
  }

  return {
    totalProspects,
    confirmedCount,
    confirmedAmount,
    proposedAmount,
    byStatus,
    fundraisingGoal: null,
  };
}

export async function listStalledProspects(
  eventId: string,
  limit = 8,
): Promise<StalledRow[]> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000);
  return db
    .select({
      id: eventCompanies.id,
      companyName: companies.name,
      status: eventCompanies.status,
      lastContactedAt: eventCompanies.lastContactedAt,
      ownerName: users.name,
    })
    .from(eventCompanies)
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, eventCompanies.ownerId))
    .where(
      and(
        eq(eventCompanies.eventId, eventId),
        isNull(eventCompanies.deletedAt),
        sql`${eventCompanies.status} = ANY(${ACTIVE_STATUSES})`,
        isNotNull(eventCompanies.lastContactedAt),
        lt(eventCompanies.lastContactedAt, cutoff),
      ),
    )
    .orderBy(asc(eventCompanies.lastContactedAt))
    .limit(limit);
}

export async function listRecentActivity(
  eventId: string,
  limit = 10,
): Promise<ActivityRow[]> {
  return db
    .select({
      id: interactions.id,
      type: interactions.type,
      subject: interactions.subject,
      occurredAt: interactions.occurredAt,
      companyName: companies.name,
      eventCompanyId: interactions.eventCompanyId,
      userName: users.name,
    })
    .from(interactions)
    .innerJoin(
      eventCompanies,
      eq(eventCompanies.id, interactions.eventCompanyId),
    )
    .innerJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(users, eq(users.id, interactions.userId))
    .where(
      and(
        eq(interactions.eventId, eventId),
        isNull(eventCompanies.deletedAt),
      ),
    )
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}

export type MyTaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  companyName: string | null;
  eventCompanyId: string | null;
};

export async function listMyOpenTasks(
  eventId: string,
  userId: string,
  limit = 10,
): Promise<MyTaskRow[]> {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      companyName: companies.name,
      eventCompanyId: tasks.eventCompanyId,
    })
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .where(
      and(
        eq(tasks.eventId, eventId),
        eq(tasks.assignedTo, userId),
        isNull(tasks.completedAt),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
}
