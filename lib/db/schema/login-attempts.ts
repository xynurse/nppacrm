import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { citext } from "./columns";

/**
 * Failed sign-in attempts, used to throttle password guessing. Rows are
 * short-lived: `lib/auth/throttle.ts` prunes anything older than a day.
 * Not FK'd to users so attempts against unknown emails are counted too.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: citext("email").notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("login_attempts_email_idx").on(table.email, table.createdAt),
    index("login_attempts_ip_idx").on(table.ipAddress, table.createdAt),
  ],
);
