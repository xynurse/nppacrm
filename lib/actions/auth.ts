"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/schemas/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginAction(raw: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    // Matched by code, not class, in case Auth.js re-creates the error.
    if (err instanceof CredentialsSignin && err.code === "locked") {
      return {
        ok: false,
        error: "Too many sign-in attempts. Try again in 15 minutes.",
      };
    }
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password" };
    }
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
