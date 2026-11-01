import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/lib/db";

type Statement = BatchItem<"pg"> & PromiseLike<unknown>;

/** Run statements as one atomic Neon HTTP transaction.
 * `neon-http` has no interactive transactions; `db.batch` submits the list
 * through `sql.transaction`, which commits all of them or none.
 * A single statement is executed directly — batch wants two or more. */
export async function runAtomic(
  statements: ReadonlyArray<Statement | null>,
): Promise<unknown[]> {
  const queries = statements.filter((statement): statement is Statement => {
    return statement != null;
  });
  if (queries.length === 0) return [];
  if (queries.length === 1) return [await queries[0]!];
  return db.batch(
    queries as unknown as [BatchItem<"pg">, ...BatchItem<"pg">[]],
  );
}
