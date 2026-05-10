import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "viewer";
      activeEventId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "viewer";
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    sub: string;
    role: "admin" | "viewer";
    activeEventId: string | null;
  }
}
