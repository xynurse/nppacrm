import NextAuth from "next-auth";
import { edgeAuthConfig } from "@/lib/auth/edge-config";

export default NextAuth(edgeAuthConfig).auth;

export const config = {
  matcher: ["/((?!_next|api/auth|favicon.ico|.*\\..*).*)"],
};
