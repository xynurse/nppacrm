import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

export const {
  handlers,
  signIn,
  signOut,
  auth,
  unstable_update: updateSession,
} = NextAuth(authConfig);
