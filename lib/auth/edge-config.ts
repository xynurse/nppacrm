import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config for middleware.
 *
 * Must not import bcrypt, Drizzle, Neon, or any Node-only module — those pull
 * ~hundreds of KB into the middleware bundle. Credentials `authorize` lives in
 * `lib/auth/config.ts` and is only used by the Node Auth.js handlers.
 */
export const edgeAuthConfig = {
  // Role/active are re-checked against the DB per request (lib/auth), so this
  // only bounds how long an idle cookie stays usable.
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
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
} satisfies NextAuthConfig;
