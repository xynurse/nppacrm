/**
 * Reset a user's password by email.
 *
 * The plaintext password is never stored — it's bcrypt-hashed (cost 12, matching
 * the seed) and written to users.password_hash. Use this to recover admin access
 * when the original SEED_ADMIN_PASSWORD is lost.
 *
 * Usage (per the no-DB-from-Claude rule, the human runs this):
 *   pnpm tsx scripts/reset-admin-password.ts <email> <newPassword>
 *
 * Or via env vars (avoids the password landing in shell history):
 *   RESET_EMAIL=mike@thorn.ooo RESET_PASSWORD='…' pnpm tsx scripts/reset-admin-password.ts
 *
 * Targets whatever DATABASE_URL points at in .env.local / .env. To reset the
 * production admin, point those at prod before running — that's your call.
 */
import { config } from "dotenv";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = (process.argv[2] ?? process.env.RESET_EMAIL ?? "").trim();
  const newPassword = process.argv[3] ?? process.env.RESET_PASSWORD ?? "";

  if (!email || !newPassword) {
    throw new Error(
      "Usage: pnpm tsx scripts/reset-admin-password.ts <email> <newPassword>\n" +
        "   or: RESET_EMAIL=… RESET_PASSWORD=… pnpm tsx scripts/reset-admin-password.ts",
    );
  }
  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to reset a password.");

  const sql = neon(url);
  const db = drizzle(sql);

  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    throw new Error(`No user found with email "${email}".`);
  }

  const passwordHash = await hash(newPassword, 12);

  await db
    .update(schema.users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  await db.insert(schema.auditLog).values({
    userId: user.id,
    action: "user.password_reset",
    entityType: "user",
    entityId: user.id,
    changes: { method: "reset-admin-password script" },
  });

  console.log(`✅ Password reset for ${email} (${user.name}, id ${user.id}).`);
  console.log("You can now log in with the new password.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
