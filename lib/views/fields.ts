import type { FilterFieldType, FilterOperator } from "./types";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
  type CustomFieldType,
} from "@/lib/db/schema";
import { PROSPECT_STATUS_LABELS } from "@/components/companies/status-badge";

export type FieldOption = { value: string; label: string };

export type FieldMeta = {
  key: string;
  label: string;
  type: FilterFieldType;
  operators: FilterOperator[];
  options?: FieldOption[];
  sortable: boolean;
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const TEXT_OPS: FilterOperator[] = [
  "contains",
  "starts_with",
  "equals",
  "is_empty",
  "is_not_empty",
];
const SELECT_OPS: FilterOperator[] = [
  "is",
  "is_not",
  "is_one_of",
  "is_empty",
  "is_not_empty",
];
const NUMBER_OPS: FilterOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "is_empty",
  "is_not_empty",
];
const DATE_OPS: FilterOperator[] = [
  "before",
  "after",
  "on",
  "between",
  "last_n_days",
  "next_n_days",
  "older_than_n_days",
  "is_empty",
  "is_not_empty",
];
const BOOLEAN_OPS: FilterOperator[] = ["is_true", "is_false"];

export const COMPANY_FIELDS: FieldMeta[] = [
  {
    key: "companyName",
    label: "Company",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "industry",
    label: "Industry",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "category",
    label: "Category",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "subcategory",
    label: "Subcategory",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "hqLocation",
    label: "HQ location",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "paidAt",
    label: "Paid at",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "boothNumber",
    label: "Booth #",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    operators: SELECT_OPS,
    options: PROSPECT_STATUS_VALUES.map((v) => ({
      value: v,
      label: PROSPECT_STATUS_LABELS[v],
    })),
    sortable: true,
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    operators: SELECT_OPS,
    options: PROSPECT_PRIORITY_VALUES.map((v) => ({
      value: v,
      label: PRIORITY_LABELS[v] ?? v,
    })),
    sortable: true,
  },
  {
    key: "ownerId",
    label: "Owner",
    type: "person",
    operators: SELECT_OPS,
    sortable: true,
  },
  {
    key: "targetTierId",
    label: "Target tier",
    type: "tier",
    operators: SELECT_OPS,
    sortable: true,
  },
  {
    key: "proposedAmount",
    label: "Proposed",
    type: "currency",
    operators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: "confirmedAmount",
    label: "Confirmed",
    type: "currency",
    operators: NUMBER_OPS,
    sortable: true,
  },
  {
    key: "lastContactedAt",
    label: "Last contact",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "nextActionAt",
    label: "Next action",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "proposalValidUntil",
    label: "Proposal valid until",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "hasPendingReview",
    label: "Pending review",
    type: "boolean",
    operators: BOOLEAN_OPS,
    sortable: false,
  },
  {
    key: "agreementSignedAt",
    label: "Agreement signed",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "invoiceSentAt",
    label: "Invoice sent",
    type: "date",
    operators: DATE_OPS,
    sortable: true,
  },
  {
    key: "repNames",
    label: "Rep names",
    type: "text",
    operators: TEXT_OPS,
    sortable: true,
  },
  {
    key: "tags",
    label: "Tags",
    type: "text",
    // Matches against the tagsCache array — "contains" does a partial match on
    // any tag, "equals" matches a whole tag (both case-insensitive).
    operators: ["contains", "equals", "is_empty", "is_not_empty"],
    sortable: false,
  },
];

export const COMPANY_FIELDS_BY_KEY: Record<string, FieldMeta> =
  Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, f]));

export function getCompanyField(key: string): FieldMeta | null {
  return COMPANY_FIELDS_BY_KEY[key] ?? null;
}

export const CUSTOM_FIELD_PREFIX = "custom:";
const CUSTOM_KEY_RE = /^[a-z][a-z0-9_]*$/;

export function customFieldFilterKey(key: string): string {
  return `${CUSTOM_FIELD_PREFIX}${key}`;
}

export function parseCustomFieldKey(field: string): string | null {
  if (!field.startsWith(CUSTOM_FIELD_PREFIX)) return null;
  const key = field.slice(CUSTOM_FIELD_PREFIX.length);
  return CUSTOM_KEY_RE.test(key) ? key : null;
}

export function fieldMetaForCustom(def: {
  key: string;
  label: string;
  fieldType: CustomFieldType;
  config: { options?: Array<{ value: string; label: string }> };
}): FieldMeta | null {
  const key = customFieldFilterKey(def.key);
  switch (def.fieldType) {
    case "file":
      return null;
    case "checkbox":
      return {
        key,
        label: def.label,
        type: "boolean",
        operators: BOOLEAN_OPS,
        sortable: false,
      };
    case "number":
    case "currency":
      return {
        key,
        label: def.label,
        type: "currency",
        operators: NUMBER_OPS,
        sortable: true,
      };
    case "date":
      return {
        key,
        label: def.label,
        type: "date",
        operators: DATE_OPS,
        sortable: true,
      };
    case "singleSelect":
      return {
        key,
        label: def.label,
        type: "select",
        operators: SELECT_OPS,
        options: def.config.options ?? [],
        sortable: true,
      };
    case "longText":
      return {
        key,
        label: def.label,
        type: "text",
        operators: TEXT_OPS,
        sortable: false,
      };
    default:
      return {
        key,
        label: def.label,
        type: "text",
        operators: TEXT_OPS,
        sortable: true,
      };
  }
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  starts_with: "starts with",
  equals: "is",
  is: "is",
  is_not: "is not",
  is_one_of: "is any of",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "between",
  before: "before",
  after: "after",
  on: "on",
  last_n_days: "in last N days",
  next_n_days: "in next N days",
  older_than_n_days: "more than N days ago",
  is_true: "is true",
  is_false: "is false",
};
