import { aliasedTable, and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, eventCompanies, tasks, users } from "@/lib/db/schema";

const assignees = aliasedTable(users, "task_assignees");

export type TaskRow = {
  id: string;
  eventId: string;
  eventCompanyId: string | null;
  companyName: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: typeof tasks.$inferSelect.priority;
  assignedTo: string | null;
  assigneeName: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

const baseSelect = {
  id: tasks.id,
  eventId: tasks.eventId,
  eventCompanyId: tasks.eventCompanyId,
  companyName: companies.name,
  title: tasks.title,
  description: tasks.description,
  dueDate: tasks.dueDate,
  priority: tasks.priority,
  assignedTo: tasks.assignedTo,
  assigneeName: assignees.name,
  completedAt: tasks.completedAt,
  createdAt: tasks.createdAt,
} as const;

export async function listTasksForEventCompany(
  eventCompanyId: string,
): Promise<TaskRow[]> {
  return db
    .select(baseSelect)
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(assignees, eq(assignees.id, tasks.assignedTo))
    .where(eq(tasks.eventCompanyId, eventCompanyId))
    .orderBy(
      asc(tasks.completedAt),
      asc(tasks.dueDate),
      desc(tasks.createdAt),
    );
}

export async function listTasksForEvent(
  eventId: string,
  options: { onlyOpen?: boolean; assigneeId?: string | null } = {},
): Promise<TaskRow[]> {
  const conditions = [eq(tasks.eventId, eventId)];
  if (options.onlyOpen) conditions.push(isNull(tasks.completedAt));
  if (options.assigneeId !== undefined && options.assigneeId !== null)
    conditions.push(eq(tasks.assignedTo, options.assigneeId));
  return db
    .select(baseSelect)
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(assignees, eq(assignees.id, tasks.assignedTo))
    .where(and(...conditions))
    .orderBy(
      asc(tasks.completedAt),
      asc(tasks.dueDate),
      desc(tasks.createdAt),
    );
}

export async function countOpenTasksForUser(
  eventId: string,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.eventId, eventId),
        eq(tasks.assignedTo, userId),
        isNull(tasks.completedAt),
      ),
    );
  return rows.length;
}

export async function listCompletedTasksForEvent(eventId: string) {
  return db
    .select(baseSelect)
    .from(tasks)
    .leftJoin(eventCompanies, eq(eventCompanies.id, tasks.eventCompanyId))
    .leftJoin(companies, eq(companies.id, eventCompanies.companyId))
    .leftJoin(assignees, eq(assignees.id, tasks.assignedTo))
    .where(and(eq(tasks.eventId, eventId), isNotNull(tasks.completedAt)))
    .orderBy(desc(tasks.completedAt));
}
