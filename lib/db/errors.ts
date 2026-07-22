/**
 * Postgres error-code helpers.
 *
 * The repo deploys to Vercel on every push to `main` but migrations are run
 * by hand, so there is always a window where the code is ahead of the schema.
 * Features written during that window guard on these so a missing table or
 * column degrades to "not there yet" instead of a 500.
 */

function pgErrorCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

/** Postgres `undefined_table` — the feature's migration hasn't run yet. */
export function isUndefinedTableError(err: unknown): boolean {
  return pgErrorCode(err) === "42P01";
}

/** Postgres `undefined_column` — the table exists but a newly added column
 * doesn't. Raised when code selecting/writing `*_doc` runs before 0011. */
export function isUndefinedColumnError(err: unknown): boolean {
  return pgErrorCode(err) === "42703";
}

/** Either shape of "the schema is behind this code". */
export function isMissingSchemaError(err: unknown): boolean {
  return isUndefinedTableError(err) || isUndefinedColumnError(err);
}
