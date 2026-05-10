import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "viewer"]);
export const eventStatus = pgEnum("event_status", ["active", "archived"]);

export const PROSPECT_STATUS_VALUES = [
  "prospect",
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
  "committed",
  "confirmed",
  "declined",
  "past_sponsor",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUS_VALUES)[number];
export const prospectStatus = pgEnum(
  "prospect_status",
  PROSPECT_STATUS_VALUES,
);

export const PROSPECT_PRIORITY_VALUES = ["high", "medium", "low"] as const;
export type ProspectPriority = (typeof PROSPECT_PRIORITY_VALUES)[number];
export const prospectPriority = pgEnum(
  "prospect_priority",
  PROSPECT_PRIORITY_VALUES,
);
