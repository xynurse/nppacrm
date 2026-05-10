import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "viewer"]);
export const eventStatus = pgEnum("event_status", ["active", "archived"]);
