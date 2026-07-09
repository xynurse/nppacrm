"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { contactEmailHistory, contacts } from "@/lib/db/schema";
import { isUndefinedTableError } from "@/lib/db/queries/contacts";

/** Normalize for a case/whitespace-insensitive email comparison (matches the
 * citext column semantics), so a pure case change isn't treated as a change. */
function normalizeEmail(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function buildFullName(first: string | null, last: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const combined = [f, l].filter(Boolean).join(" ");
  return combined || "(unnamed contact)";
}

const contactPatchSchema = z.object({
  firstName: z.string().max(160).nullable().optional(),
  lastName: z.string().max(160).nullable().optional(),
  title: z.string().max(160).nullable().optional(),
  email: z.union([z.email().max(320), z.literal(""), z.null()]).optional(),
  phone: z.string().max(64).nullable().optional(),
  linkedinUrl: z
    .union([z.url().max(2048), z.literal(""), z.null()])
    .optional(),
});

const createContactSchema = contactPatchSchema.extend({
  companyId: z.uuid(),
  isPrimary: z.boolean().optional(),
});

export async function createContact(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  const parsed = createContactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const fullName = buildFullName(data.firstName ?? null, data.lastName ?? null);
  const [row] = await db
    .insert(contacts)
    .values({
      companyId: data.companyId,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      fullName,
      title: data.title ?? null,
      email: data.email ? data.email : null,
      phone: data.phone ?? null,
      linkedinUrl: data.linkedinUrl ? data.linkedinUrl : null,
      isPrimary: data.isPrimary ?? false,
    })
    .returning({ id: contacts.id });
  if (!row) return { ok: false, error: "Failed to create contact" };

  if (data.isPrimary) {
    await db
      .update(contacts)
      .set({ isPrimary: false })
      .where(
        and(eq(contacts.companyId, data.companyId), ne(contacts.id, row.id)),
      );
  }

  await recordAudit({
    userId: session.user.id,
    action: "contact.create",
    entityType: "contact",
    entityId: row.id,
    changes: { ...data, fullName },
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return { ok: true, data: { id: row.id } };
}

const updateContactSchema = contactPatchSchema.extend({
  id: z.uuid(),
  isPrimary: z.boolean().optional(),
});

export async function updateContact(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateContactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, ...patch } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if ("firstName" in patch) updates.firstName = patch.firstName ?? null;
  if ("lastName" in patch) updates.lastName = patch.lastName ?? null;
  if ("title" in patch) updates.title = patch.title ?? null;
  if ("email" in patch) updates.email = patch.email ? patch.email : null;
  if ("phone" in patch) updates.phone = patch.phone ?? null;
  if ("linkedinUrl" in patch)
    updates.linkedinUrl = patch.linkedinUrl ? patch.linkedinUrl : null;
  if ("isPrimary" in patch) updates.isPrimary = patch.isPrimary;

  // Fetch the existing row when we need to recompute the name OR archive a
  // changed email.
  const needsExisting =
    "firstName" in patch || "lastName" in patch || "email" in patch;
  let archivedEmail: string | null = null;
  if (needsExisting) {
    const [existing] = await db
      .select({
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
      })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (!existing) return { ok: false, error: "Contact not found" };

    if ("firstName" in patch || "lastName" in patch) {
      const first =
        "firstName" in patch ? patch.firstName ?? null : existing.firstName;
      const last =
        "lastName" in patch ? patch.lastName ?? null : existing.lastName;
      updates.fullName = buildFullName(first, last);
    }

    // Archive the OLD email whenever the address actually changes (or is
    // cleared) and there was a non-empty prior address to retain.
    if ("email" in patch) {
      const newEmail = patch.email ? patch.email : null;
      const oldEmail = existing.email;
      if (
        oldEmail &&
        normalizeEmail(oldEmail) !== normalizeEmail(newEmail)
      ) {
        archivedEmail = oldEmail;
      }
    }
  }

  await db.update(contacts).set(updates).where(eq(contacts.id, id));

  if (archivedEmail) {
    // Best-effort: archiving must never block saving the contact. If the
    // table isn't migrated yet, skip silently; rethrow anything else.
    try {
      await db.insert(contactEmailHistory).values({
        contactId: id,
        email: archivedEmail,
        changedBy: session.user.id,
      });
    } catch (err) {
      if (!isUndefinedTableError(err)) throw err;
    }
  }

  if (patch.isPrimary === true) {
    const [row] = await db
      .select({ companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (row) {
      await db
        .update(contacts)
        .set({ isPrimary: false })
        .where(
          and(eq(contacts.companyId, row.companyId), ne(contacts.id, id)),
        );
    }
  }

  await recordAudit({
    userId: session.user.id,
    action: "contact.update",
    entityType: "contact",
    entityId: id,
    changes: patch,
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return { ok: true };
}

const deleteContactSchema = z.object({ id: z.uuid() });

export async function deleteContact(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = deleteContactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await db
    .update(contacts)
    .set({ deletedAt: new Date() })
    .where(eq(contacts.id, parsed.data.id));

  await recordAudit({
    userId: session.user.id,
    action: "contact.soft_delete",
    entityType: "contact",
    entityId: parsed.data.id,
  });

  revalidatePath("/companies");
  revalidatePath("/contacts");
  return { ok: true };
}
