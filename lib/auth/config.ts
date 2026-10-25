import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  clearLoginFailures,
  clientIp,
  isLoginLocked,
  recordLoginFailure,
} from "./throttle";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * Valid cost-12 bcrypt hash of a random throwaway string. Compared against
 * when the email doesn't exist so unknown and known emails take the same time.
 */
const DUMMY_HASH =
  "$2b$12$2C14vw6Chu27l8eKrZGcX.RSmqctNTBBXyo8hmwWjypSCl74o/vhC";

/** Thrown (not returned) so `loginAction` can show a lockout message. */
class LoginLockedError extends CredentialsSignin {
  override code = "locked";
}

export const authConfig: NextAuthConfig = {
  // Role/active are re-checked against the DB per request (lib/auth), so this
  // only bounds how long an idle cookie stays usable.
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email;
        const ip = clientIp(request.headers);

        // Throttle lives here, not in loginAction, because the Auth.js
        // callback endpoint can be POSTed directly.
        if (await isLoginLocked(email, ip)) throw new LoginLockedError();

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const ok = await compare(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !user.isActive || !ok) {
          await recordLoginFailure(email, ip);
          return null;
        }

        await clearLoginFailures(email);

        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        if (user.id) token.sub = user.id;
        token.role = user.role;
        token.activeEventId = null;
      }
      if (
        trigger === "update" &&
        session &&
        typeof session === "object" &&
        "user" in session &&
        session.user &&
        typeof session.user === "object" &&
        "activeEventId" in session.user
      ) {
        token.activeEventId = (session.user as { activeEventId: string | null })
          .activeEventId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? "viewer";
      session.user.activeEventId = token.activeEventId ?? null;
      return session;
    },
    authorized: async ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isAuthPage = path.startsWith("/login");
      if (isAuthPage) return true;
      return isLoggedIn;
    },
  },
};
