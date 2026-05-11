"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  companies,
  eventCompanies,
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
  type ProspectPriority,
} from "@/lib/db/schema";
import { listEventCompanies } from "@/lib/db/queries/companies";
import { sanitizeFilter, sanitizeSort } from "@/lib/views/schema";
import type { FilterAst, SortSpec } from "@/lib/views/types";

const EXPORT_COLUMNS = [
  "companyName",
  "industry",
  "hqLocation",
  "status",
  "priority",
  "owner",
  "targetTier",
  "confirmedTier",
  "proposedAmount",
  "confirmedAmount",
  "lastContactedAt",
  "nextActionAt",
] as const;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const exportSchema = z.object({
  eventId: z.uuid(),
  filter: z.unknown().optional(),
  sort: z.unknown().optional(),
});

export async function exportEventCompaniesCsv(
  raw: unknown,
): Promise<
  { ok: true; filename: string; csv: string } | { ok: false; error: string }
> {
  const session = await requireSession();
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const filter = sanitizeFilter(parsed.data.filter ?? null) as FilterAst;
  const sort = sanitizeSort(parsed.data.sort ?? null) as SortSpec;

  const rows = await listEventCompanies(parsed.data.eventId, { filter, sort });

  const header = EXPORT_COLUMNS.join(",");
  const lines = rows.map((r) =>
    [
      escapeCsv(r.companyName),
      escapeCsv(r.companyIndustry),
      escapeCsv(r.companyHqLocation),
      escapeCsv(r.status),
      escapeCsv(r.priority),
      escapeCsv(r.ownerName),
      escapeCsv(r.targetTierName),
      escapeCsv(r.confirmedTierName),
      escapeCsv(r.proposedAmount),
      escapeCsv(r.confirmedAmount),
      escapeCsv(
        r.lastContactedAt ? r.lastContactedAt.toISOString() : "",
      ),
      escapeCsv(
        r.nextActionAt ? r.nextActionAt.toISOString() : "",
      ),
    ].join(","),
  );
  const csv = [header, ...lines].join("\n");

  await recordAudit({
    userId: session.user.id,
    eventId: parsed.data.eventId,
    action: "eventCompany.export_csv",
    entityType: "eventCompany",
    entityId: `bulk:${rows.length}`,
    changes: { count: rows.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    filename: `prospects-${stamp}.csv`,
    csv,
  };
}

const importRowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  industry: z.string().trim().max(120).optional().nullable(),
  hqLocation: z.string().trim().max(160).optional().nullable(),
  status: z.enum(PROSPECT_STATUS_VALUES).optional(),
  priority: z.enum(PROSPECT_PRIORITY_VALUES).optional(),
  proposedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u)
    .optional()
    .nullable(),
  confirmedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/u)
    .optional()
    .nullable(),
});

const importSchema = z.object({
  eventId: z.uuid(),
  rows: z.array(importRowSchema).min(1).max(2000),
  commit: z.boolean(),
});

export type ImportPreview = {
  totalRows: number;
  toCreate: number;
  toAttachExisting: number;
  alreadyOnEvent: number;
  errors: Array<{ index: number; message: string }>;
};

export async function importEventCompaniesCsv(
  raw: unknown,
): Promise<
  | { ok: true; preview: ImportPreview }
  | { ok: false; error: string }
> {
  const session = await requireAdmin();
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { eventId, rows, commit } = parsed.data;

  const names = Array.from(new Set(rows.map((r) => r.name)));
  const existingByName = names.length
    ? await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(
          and(
            inArray(sql`LOWER(${companies.name})`, names.map((n) => n.toLowerCase())),
            isNull(companies.deletedAt),
          ),
        )
    : [];
  const companyByLowerName = new Map<string, string>();
  for (const c of existingByName) {
    companyByLowerName.set(c.name.toLowerCase(), c.id);
  }

  const existingOnEvent = existingByName.length
    ? await db
        .select({ companyId: eventCompanies.companyId })
        .from(eventCompanies)
        .where(
          and(
            eq(eventCompanies.eventId, eventId),
            inArray(
              eventCompanies.companyId,
              Array.from(companyByLowerName.values()),
            ),
          ),
        )
    : [];
  const alreadyAttached = new Set(existingOnEvent.map((r) => r.companyId));

  let toCreate = 0;
  let toAttachExisting = 0;
  let alreadyOnEvent = 0;
  const errors: ImportPreview["errors"] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]!;
    const lower = r.name.toLowerCase();
    if (seenInBatch.has(lower)) {
      errors.push({ index: i, message: `Duplicate within file: ${r.name}` });
      continue;
    }
    seenInBatch.add(lower);
    const existingId = companyByLowerName.get(lower);
    if (existingId) {
      if (alreadyAttached.has(existingId)) {
        alreadyOnEvent += 1;
      } else {
        toAttachExisting += 1;
      }
    } else {
      toCreate += 1;
    }
  }

  if (!commit) {
    return {
      ok: true,
      preview: {
        totalRows: rows.length,
        toCreate,
        toAttachExisting,
        alreadyOnEvent,
        errors,
      },
    };
  }

  let createdCompanies = 0;
  let attached = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]!;
    const lower = r.name.toLowerCase();
    let companyId = companyByLowerName.get(lower);
    if (!companyId) {
      const [created] = await db
        .insert(companies)
        .values({
          name: r.name,
          industry: r.industry ?? null,
          hqLocation: r.hqLocation ?? null,
        })
        .returning({ id: companies.id });
      if (!created) continue;
      companyId = created.id;
      companyByLowerName.set(lower, companyId);
      createdCompanies += 1;
    }

    if (alreadyAttached.has(companyId)) continue;
    const inserted = await db
      .insert(eventCompanies)
      .values({
        eventId,
        companyId,
        ownerId: session.user.id,
        status: r.status ?? "prospect",
        priority: (r.priority ?? "medium") as ProspectPriority,
        proposedAmount: r.proposedAmount ?? null,
        confirmedAmount: r.confirmedAmount ?? null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .onConflictDoNothing({
        target: [eventCompanies.eventId, eventCompanies.companyId],
      })
      .returning({ id: eventCompanies.id });
    if (inserted.length > 0) {
      attached += 1;
      alreadyAttached.add(companyId);
    }
  }

  await recordAudit({
    userId: session.user.id,
    eventId,
    action: "eventCompany.import_csv",
    entityType: "eventCompany",
    entityId: `bulk:${rows.length}`,
    changes: {
      totalRows: rows.length,
      createdCompanies,
      attached,
    },
  });

  revalidatePath("/companies");
  revalidatePath(`/admin/events/${eventId}/import`);

  return {
    ok: true,
    preview: {
      totalRows: rows.length,
      toCreate: createdCompanies,
      toAttachExisting: attached - createdCompanies,
      alreadyOnEvent,
      errors,
    },
  };
}

