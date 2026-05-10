import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type RecordAuditInput = {
  userId: string | null;
  eventId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
};

export async function recordAudit(input: RecordAuditInput) {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");

  await db.insert(auditLog).values({
    userId: input.userId,
    eventId: input.eventId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes ?? {},
    ipAddress,
    userAgent,
  });
}
