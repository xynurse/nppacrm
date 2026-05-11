"use server";

import { requireSession } from "@/lib/auth";
import { searchAll, type SearchResult } from "@/lib/db/queries/search";

export async function searchPalette(input: {
  eventId: string;
  query: string;
}): Promise<{ ok: true; results: SearchResult[] } | { ok: false; error: string }> {
  await requireSession();
  if (!input.eventId) return { ok: false, error: "No event" };
  const q = (input.query ?? "").trim();
  if (q.length < 1) return { ok: true, results: [] };
  if (q.length > 80) return { ok: false, error: "Query too long" };
  const results = await searchAll(input.eventId, q);
  return { ok: true, results };
}
