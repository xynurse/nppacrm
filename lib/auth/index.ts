import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Session whose role / active flag were re-read from the database for this
 * request. The JWT only carries what was true at sign-in, so trusting it would
 * let a deactivated or demoted user keep access until the cookie expires.
 * Wrapped in React `cache()` so a page + its actions share one lookup.
 */
export const getVerifiedSession = cache(
  async (): Promise<Session | null> => {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [row] = await db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!row || !row.isActive) return null;

    return { ...session, user: { ...session.user, role: row.role } };
  },
);

export async function requireSession() {
  const session = await getVerifiedSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

