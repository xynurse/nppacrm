"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { docToPlainText, richDocSchema } from "@/lib/tiptap/serialize";

type ActionResult = { ok: true } | { ok: false; error: string };

const updateNotesSchema = z.object({
  companyId: z.uuid(),
  doc: richDocSchema.nullable(),
});

/**
 * Long-form company notes, stored in the `companies.notes_doc` jsonb column.
 *
 * That column has existed since migration 0001 but was never wired up to
 * anything — this is the first writer. No plain-text mirror here: unlike
 * interaction bodies, nothing else in the app reads company notes.
 */
export async function updateCompanyNotes(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateNotesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { companyId, doc } = parsed.data;

  await db
    .update(companies)
    .set({ notesDoc: doc, updatedAt: new Date() })
    .where(eq(companies.id, companyId));

  await recordAudit({
    userId: session.user.id,
    action: "company.update_notes",
    entityType: "company",
    entityId: companyId,
    // The full doc would bloat the audit table; a length signal is enough to
    // tell "cleared" from "edited" when reading history.
    changes: { notesLength: docToPlainText(doc).length },
  });

  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { ok: true };
}
