import { config } from "dotenv";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to seed");

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed",
    );
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    const passwordHash = await hash(adminPassword, 12);
    await db.insert(schema.users).values({
      email: adminEmail,
      name: "Admin",
      role: "admin",
      passwordHash,
    });
    console.log(`Created admin user ${adminEmail}.`);
  } else {
    console.log(`Admin user ${adminEmail} already exists; skipping.`);
  }

  const lpdSlug = "lpd-2026";
  const existingEvent = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(eq(schema.events.slug, lpdSlug))
    .limit(1);

  if (existingEvent.length === 0) {
    await db.insert(schema.events).values({
      name: "Leadership & Professional Development for NPs & PAs 2026",
      slug: lpdSlug,
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      currency: "USD",
      timezone: "America/Chicago",
    });
    console.log(`Created event ${lpdSlug}.`);
  } else {
    console.log(`Event ${lpdSlug} already exists; skipping.`);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
