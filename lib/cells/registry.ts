import { z } from "zod";
import { PROSPECT_PRIORITY_VALUES, PROSPECT_STATUS_VALUES } from "@/lib/db/schema";

export type CellType =
  | "text"
  | "longText"
  | "url"
  | "currency"
  | "date"
  | "checkbox"
  | "singleSelect"
  | "person"
  | "relation";

export type EntityType = "eventCompany" | "company";

type BaseField = {
  entity: EntityType;
  column: string;
  label: string;
  type: CellType;
};

type TextField = BaseField & { type: "text" | "longText" | "url" };
type CurrencyField = BaseField & { type: "currency" };
type DateField = BaseField & { type: "date" };
type CheckboxField = BaseField & { type: "checkbox" };
type SingleSelectField = BaseField & {
  type: "singleSelect";
  options: readonly string[];
};
type PersonField = BaseField & { type: "person" };
type RelationField = BaseField & { type: "relation"; target: "tier" };

export type FieldDef =
  | TextField
  | CurrencyField
  | DateField
  | CheckboxField
  | SingleSelectField
  | PersonField
  | RelationField;

export const FIELD_REGISTRY = {
  // companies (global)
  "company.name": {
    entity: "company",
    column: "name",
    label: "Company name",
    type: "text",
  } satisfies FieldDef,
  "company.website": {
    entity: "company",
    column: "website",
    label: "Website",
    type: "url",
  } satisfies FieldDef,
  "company.industry": {
    entity: "company",
    column: "industry",
    label: "Industry",
    type: "text",
  } satisfies FieldDef,
  "company.hqLocation": {
    entity: "company",
    column: "hq_location",
    label: "HQ",
    type: "text",
  } satisfies FieldDef,
  "company.shortDescription": {
    entity: "company",
    column: "short_description",
    label: "Description",
    type: "longText",
  } satisfies FieldDef,

  // eventCompanies (per-event)
  "eventCompany.status": {
    entity: "eventCompany",
    column: "status",
    label: "Status",
    type: "singleSelect",
    options: PROSPECT_STATUS_VALUES,
  } satisfies FieldDef,
  "eventCompany.priority": {
    entity: "eventCompany",
    column: "priority",
    label: "Priority",
    type: "singleSelect",
    options: PROSPECT_PRIORITY_VALUES,
  } satisfies FieldDef,
  "eventCompany.ownerId": {
    entity: "eventCompany",
    column: "owner_id",
    label: "Owner",
    type: "person",
  } satisfies FieldDef,
  "eventCompany.targetTierId": {
    entity: "eventCompany",
    column: "target_tier_id",
    label: "Target tier",
    type: "relation",
    target: "tier",
  } satisfies FieldDef,
  "eventCompany.confirmedTierId": {
    entity: "eventCompany",
    column: "confirmed_tier_id",
    label: "Confirmed tier",
    type: "relation",
    target: "tier",
  } satisfies FieldDef,
  "eventCompany.proposedAmount": {
    entity: "eventCompany",
    column: "proposed_amount",
    label: "Proposed amount",
    type: "currency",
  } satisfies FieldDef,
  "eventCompany.confirmedAmount": {
    entity: "eventCompany",
    column: "confirmed_amount",
    label: "Confirmed amount",
    type: "currency",
  } satisfies FieldDef,
  "eventCompany.nextActionAt": {
    entity: "eventCompany",
    column: "next_action_at",
    label: "Next action",
    type: "date",
  } satisfies FieldDef,
  "eventCompany.lastContactedAt": {
    entity: "eventCompany",
    column: "last_contacted_at",
    label: "Last contact",
    type: "date",
  } satisfies FieldDef,
  "eventCompany.whyTheyShouldAttend": {
    entity: "eventCompany",
    column: "why_they_should_attend",
    label: "Why they should attend",
    type: "longText",
  } satisfies FieldDef,
  "eventCompany.keyTalkingPoints": {
    entity: "eventCompany",
    column: "key_talking_points",
    label: "Key talking points",
    type: "longText",
  } satisfies FieldDef,
  "eventCompany.emailAngle": {
    entity: "eventCompany",
    column: "email_angle",
    label: "Email angle",
    type: "longText",
  } satisfies FieldDef,
  "eventCompany.sponsorshipHook": {
    entity: "eventCompany",
    column: "sponsorship_hook",
    label: "Sponsorship hook",
    type: "longText",
  } satisfies FieldDef,
  "eventCompany.companyContext": {
    entity: "eventCompany",
    column: "company_context",
    label: "Company context",
    type: "longText",
  } satisfies FieldDef,
  "eventCompany.relationshipNotes": {
    entity: "eventCompany",
    column: "relationship_notes",
    label: "Relationship notes",
    type: "longText",
  } satisfies FieldDef,
} as const;

export type FieldKey = keyof typeof FIELD_REGISTRY;

export function isFieldKey(key: string): key is FieldKey {
  return Object.prototype.hasOwnProperty.call(FIELD_REGISTRY, key);
}

const dateRegex = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u;

export function valueValidator(field: FieldDef): z.ZodType {
  const nullable = z.null();
  switch (field.type) {
    case "text":
    case "longText":
      return z.string().max(8000).nullable();
    case "url":
      return z.union([z.url().max(2048), nullable, z.literal("")]);
    case "currency":
      return z.union([
        z
          .string()
          .regex(/^\d+(\.\d{1,2})?$/u, "Use digits with up to 2 decimals"),
        nullable,
        z.literal(""),
      ]);
    case "date":
      return z.union([
        z.date(),
        z.string().regex(dateRegex),
        nullable,
        z.literal(""),
      ]);
    case "checkbox":
      return z.boolean();
    case "singleSelect":
      return z.union([z.enum(field.options as readonly [string, ...string[]]), nullable]);
    case "person":
      return z.union([z.uuid(), nullable]);
    case "relation":
      return z.union([z.uuid(), nullable]);
  }
}

export function normalizeValue(field: FieldDef, raw: unknown): unknown {
  if (raw === "") {
    if (field.type === "text" || field.type === "longText") return null;
    if (field.type === "url") return null;
    if (field.type === "currency") return null;
    if (field.type === "date") return null;
    if (field.type === "person" || field.type === "relation") return null;
    if (field.type === "singleSelect") return null;
  }
  return raw;
}
