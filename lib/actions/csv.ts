"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  companies,
  contacts,
  eventCompanies,
  sponsorshipTiers,
  users,
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

const amount = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/u)
  .optional()
  .nullable();
const longText = z.string().trim().max(8000).optional().nullable();
const shortText = z.string().trim().max(300).optional().nullable();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .optional()
  .nullable();

const importRowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: shortText,
  industry: z.string().trim().max(120).optional().nullable(),
  subcategory: z.string().trim().max(160).optional().nullable(),
  hqLocation: z.string().trim().max(160).optional().nullable(),
  status: z.enum(PROSPECT_STATUS_VALUES).optional(),
  priority: z.enum(PROSPECT_PRIORITY_VALUES).optional(),
  owner: shortText,
  targetTier: shortText,
  proposedAmount: amount,
  confirmedAmount: amount,
  whyTheyShouldAttend: longText,
  keyTalkingPoints: longText,
  emailAngle: longText,
  sponsorshipHook: longText,
  relationshipNotes: longText,
  firstContactedAt: isoDate,
  lastContactedAt: isoDate,
  contact1FirstName: shortText,
  contact1LastName: shortText,
  contact1Email: shortText,
  contact1Title: shortText,
  contact1Phone: shortText,
  contact1Linkedin: shortText,
  contact2FirstName: shortText,
  contact2LastName: shortText,
  contact2Email: shortText,
  contact2Title: shortText,
  contact2Phone: shortText,
  contact2Linkedin: shortText,
});

type ImportRow = z.infer<typeof importRowSchema>;

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type ContactSeed = {
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  title: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
};

function contactFromRow(
  r: ImportRow,
  which: 1 | 2,
): ContactSeed | null {
  const first = which === 1 ? r.contact1FirstName : r.contact2FirstName;
  const last = which === 1 ? r.contact1LastName : r.contact2LastName;
  const email = which === 1 ? r.contact1Email : r.contact2Email;
  const title = which === 1 ? r.contact1Title : r.contact2Title;
  const phone = which === 1 ? r.contact1Phone : r.contact2Phone;
  const linkedin = which === 1 ? r.contact1Linkedin : r.contact2Linkedin;
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  const resolvedName = fullName || email?.trim() || "";
  if (!resolvedName) return null;
  return {
    firstName: first?.trim() || null,
    lastName: last?.trim() || null,
    fullName: resolvedName,
    email: email?.trim() || null,
    title: title?.trim() || null,
    phone: phone?.trim() || null,
    linkedinUrl: linkedin?.trim() || null,
    isPrimary: which === 1,
  };
}

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

  // Resolve owner names -> user ids (case-insensitive: full name, first token, or email local-part).
  const ownerTokens = new Set(
    rows
      .map((r) => r.owner?.trim().toLowerCase())
      .filter((o): o is string => Boolean(o)),
  );
  const ownerByToken = new Map<string, string>();
  if (ownerTokens.size > 0) {
    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users);
    for (const u of allUsers) {
      const name = u.name.toLowerCase();
      const first = name.split(/\s+/u)[0];
      const local = u.email.toLowerCase().split("@")[0];
      for (const key of [name, first, local]) {
        if (key && !ownerByToken.has(key)) ownerByToken.set(key, u.id);
      }
    }
  }

  // Resolve target tier names -> tier ids for this event.
  const eventTiers = await db
    .select({ id: sponsorshipTiers.id, name: sponsorshipTiers.name })
    .from(sponsorshipTiers)
    .where(eq(sponsorshipTiers.eventId, eventId));
  const tierByLowerName = new Map(
    eventTiers.map((t) => [t.name.toLowerCase(), t.id]),
  );

  // Pre-load existing contacts for already-known companies to dedupe.
  const knownCompanyIds = Array.from(new Set(companyByLowerName.values()));
  const contactKeys = new Set<string>();
  if (knownCompanyIds.length > 0) {
    const existingContacts = await db
      .select({
        companyId: contacts.companyId,
        email: contacts.email,
        fullName: contacts.fullName,
      })
      .from(contacts)
      .where(inArray(contacts.companyId, knownCompanyIds));
    for (const c of existingContacts) {
      const key = (c.email ?? c.fullName).toLowerCase();
      contactKeys.add(`${c.companyId}|${key}`);
    }
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
          website: r.website ?? null,
          industry: r.industry ?? null,
          hqLocation: r.hqLocation ?? null,
        })
        .returning({ id: companies.id });
      if (!created) continue;
      companyId = created.id;
      companyByLowerName.set(lower, companyId);
      createdCompanies += 1;
    }

    // Insert contacts (deduped by email or full name within the company).
    for (const which of [1, 2] as const) {
      const seed = contactFromRow(r, which);
      if (!seed) continue;
      const dedupeKey = `${companyId}|${(seed.email ?? seed.fullName).toLowerCase()}`;
      if (contactKeys.has(dedupeKey)) continue;
      contactKeys.add(dedupeKey);
      await db.insert(contacts).values({
        companyId,
        firstName: seed.firstName,
        lastName: seed.lastName,
        fullName: seed.fullName,
        title: seed.title,
        email: seed.email,
        phone: seed.phone,
        linkedinUrl: seed.linkedinUrl,
        isPrimary: seed.isPrimary,
      });
    }

    if (alreadyAttached.has(companyId)) continue;
    const ownerId = r.owner
      ? (ownerByToken.get(r.owner.trim().toLowerCase()) ?? null)
      : null;
    const targetTierId = r.targetTier
      ? (tierByLowerName.get(r.targetTier.trim().toLowerCase()) ?? null)
      : null;
    const customFields = r.subcategory
      ? { subcategory: r.subcategory }
      : undefined;
    const inserted = await db
      .insert(eventCompanies)
      .values({
        eventId,
        companyId,
        ownerId,
        status: r.status ?? "prospect",
        priority: (r.priority ?? "medium") as ProspectPriority,
        targetTierId,
        proposedAmount: r.proposedAmount ?? null,
        confirmedAmount: r.confirmedAmount ?? null,
        firstContactedAt: parseIsoDate(r.firstContactedAt),
        lastContactedAt: parseIsoDate(r.lastContactedAt),
        whyTheyShouldAttend: r.whyTheyShouldAttend ?? null,
        keyTalkingPoints: r.keyTalkingPoints ?? null,
        emailAngle: r.emailAngle ?? null,
        sponsorshipHook: r.sponsorshipHook ?? null,
        relationshipNotes: r.relationshipNotes ?? null,
        ...(customFields ? { customFields } : {}),
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

