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

export const INTERACTION_TYPE_VALUES = [
  "email",
  "call",
  "meeting",
  "note",
  "linkedin",
  "other",
] as const;
export type InteractionType = (typeof INTERACTION_TYPE_VALUES)[number];
export const interactionType = pgEnum(
  "interaction_type",
  INTERACTION_TYPE_VALUES,
);

export const REVIEW_VOTE_VALUES = ["yes", "no"] as const;
export type ReviewVote = (typeof REVIEW_VOTE_VALUES)[number];
export const reviewVote = pgEnum("review_vote", REVIEW_VOTE_VALUES);

export const ENRICHMENT_STATUS_VALUES = [
  "pending",
  "running",
  "succeeded",
  "failed",
] as const;
export type EnrichmentStatus = (typeof ENRICHMENT_STATUS_VALUES)[number];
export const enrichmentStatus = pgEnum(
  "enrichment_status",
  ENRICHMENT_STATUS_VALUES,
);

export const SUGGESTION_STATUS_VALUES = [
  "pending",
  "accepted",
  "rejected",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUS_VALUES)[number];
export const suggestionStatus = pgEnum(
  "suggestion_status",
  SUGGESTION_STATUS_VALUES,
);

export const ENRICHMENT_FIELD_VALUES = [
  "whyTheyShouldAttend",
  "keyTalkingPoints",
  "emailAngle",
  "sponsorshipHook",
] as const;
export type EnrichmentField = (typeof ENRICHMENT_FIELD_VALUES)[number];

export const ENRICHMENT_FIELD_LABELS: Record<EnrichmentField, string> = {
  whyTheyShouldAttend: "Why they should attend",
  keyTalkingPoints: "Key talking points",
  emailAngle: "Email angle",
  sponsorshipHook: "Sponsorship hook",
};
