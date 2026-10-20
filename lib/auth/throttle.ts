import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { isUndefinedTableError } from "@/lib/db/errors";
import { loginAttempts } from "@/lib/db/schema";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;
const RETENTION_MS = 24 * 60 * 60_000;

/**
 * Until migration 0014 is applied the table doesn't exist. Fail open so a
 * deploy that lands before the migration can't lock everyone out of sign-in.
 */
async function tolerateMissingTable<T>(fn: () => Promise<T>, fallback: T) {
  try {
    return await fn();
  } catch (err) {
    if (isUndefinedTableError(err)) return fallback;
    throw err;
  }
}

export function clientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

/** True when this email or IP has too many recent failures to try again. */
export async function isLoginLocked(
  email: string,
  ip: string | null,
): Promise<boolean> {
  return tolerateMissingTable(() => countRecentFailures(email, ip), false);
}

async function countRecentFailures(
  email: string,
  ip: string | null,
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [byEmail] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.email, email), gte(loginAttempts.createdAt, since)),
    );
  if ((byEmail?.n ?? 0) >= MAX_FAILURES_PER_EMAIL) return true;

  if (!ip) return false;
  const [byIp] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.ipAddress, ip), gte(loginAttempts.createdAt, since)),
    );
  return (byIp?.n ?? 0) >= MAX_FAILURES_PER_IP;
}

export async function recordLoginFailure(email: string, ip: string | null) {
  await tolerateMissingTable(async () => {
    await db.insert(loginAttempts).values({ email, ipAddress: ip });
    // Opportunistic pruning keeps the table tiny without a cron job.
    await db
      .delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, new Date(Date.now() - RETENTION_MS)));
  }, undefined);
}

/** A successful sign-in clears that email's failure history. */
export async function clearLoginFailures(email: string) {
  await tolerateMissingTable(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
  }, undefined);
}
