import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type RecordAuditInput = {
  userId: string | null;
  eventId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
};

type AuditRow = {
  userId: string | null;
  eventId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
};

async function requestMeta(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent"),
  };
}

function toRow(
  input: RecordAuditInput,
  meta: { ipAddress: string | null; userAgent: string | null },
): AuditRow {
  return {
    userId: input.userId,
    eventId: input.eventId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes ?? {},
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  };
}

/** Resolve request metadata into audit row values. Kept apart from the
 * insert builder because an async function that returns a Drizzle query
 * would execute it (query builders are thenable). */
export async function auditRows(
  inputs: RecordAuditInput | RecordAuditInput[],
): Promise<AuditRow[]> {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  if (list.length === 0) return [];
  const meta = await requestMeta();
  return list.map((input) => toRow(input, meta));
}

/** Insert builder for rows from `auditRows`. Pass it to `runAtomic`. */
export function auditInsert(rows: AuditRow[]) {
  if (rows.length === 0) return null;
  return db.insert(auditLog).values(rows);
}

export async function recordAudit(input: RecordAuditInput) {
  const query = auditInsert(await auditRows(input));
  if (query) await query;
}

/** One INSERT for many audit rows (bulk actions); same request metadata on each. */
export async function recordAuditMany(inputs: RecordAuditInput[]) {
  const query = auditInsert(await auditRows(inputs));
  if (query) await query;
}
