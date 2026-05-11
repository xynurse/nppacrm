import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, events, users } from "@/lib/db/schema";

export type AuditFilter = {
  userId?: string | null;
  eventId?: string | null;
  entityType?: string | null;
  action?: string | null;
};

export type AuditRow = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  eventId: string | null;
  eventName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

const PAGE_SIZE = 200;

export async function listAuditLog(
  filter: AuditFilter = {},
): Promise<AuditRow[]> {
  const clauses: SQL[] = [];
  if (filter.userId) clauses.push(eq(auditLog.userId, filter.userId));
  if (filter.eventId) clauses.push(eq(auditLog.eventId, filter.eventId));
  if (filter.entityType)
    clauses.push(eq(auditLog.entityType, filter.entityType));
  if (filter.action) clauses.push(eq(auditLog.action, filter.action));

  const where =
    clauses.length === 0
      ? undefined
      : clauses.length === 1
        ? clauses[0]
        : and(...clauses);

  const baseQuery = db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userEmail: users.email,
      userName: users.name,
      eventId: auditLog.eventId,
      eventName: events.name,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .leftJoin(events, eq(events.id, auditLog.eventId));

  const query = where ? baseQuery.where(where) : baseQuery;

  return query.orderBy(desc(auditLog.createdAt)).limit(PAGE_SIZE);
}

export async function listAuditEntityTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ entityType: auditLog.entityType })
    .from(auditLog);
  return rows.map((r) => r.entityType).sort();
}
