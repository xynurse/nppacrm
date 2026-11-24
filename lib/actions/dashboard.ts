"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  listRecentActivity,
  type ActivityFilters,
  type ActivityRow,
} from "@/lib/db/queries/dashboard";

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .nullable()
  .optional();

const filterSchema = z.object({
  eventId: z.uuid(),
  category: z.string().trim().max(160).nullable().optional(),
  subcategory: z.string().trim().max(160).nullable().optional(),
  from: ymd,
  to: ymd,
  limit: z.number().int().min(1).max(100).optional(),
});

export type FilteredActivityResult =
  | { ok: true; items: ActivityRow[] }
  | { ok: false; error: string };

export async function fetchFilteredActivity(
  input: z.infer<typeof filterSchema>,
): Promise<FilteredActivityResult> {
  await requireSession();
  const parsed = filterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid filters." };
  }

  const { eventId, limit, ...rest } = parsed.data;
  const filters: ActivityFilters = {
    category: rest.category || null,
    subcategory: rest.subcategory || null,
    from: rest.from || null,
    to: rest.to || null,
  };

  const items = await listRecentActivity(eventId, limit ?? 40, filters);
  return { ok: true, items };
}
