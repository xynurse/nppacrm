import { sql, type SQL } from "drizzle-orm";
import { eventCompanies } from "@/lib/db/schema";

/** One-key jsonb update. Clearing removes the key; otherwise the key is
 * merged with `||`, so two concurrent edits of different keys both survive. */
export function customFieldsPatch(key: string, value: unknown): SQL {
  if (value === null || value === "") {
    return sql`coalesce(${eventCompanies.customFields}, '{}'::jsonb) - ${key}`;
  }
  return sql`coalesce(${eventCompanies.customFields}, '{}'::jsonb) || jsonb_build_object(${key}::text, ${JSON.stringify(value)}::jsonb)`;
}
