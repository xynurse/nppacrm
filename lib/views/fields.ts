import type { FilterFieldType, FilterOperator } from "./types";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
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
    key: "hqLocation",
    label: "HQ location",
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
    key: "hasPendingReview",
    label: "Pending review",
    type: "boolean",
    operators: BOOLEAN_OPS,
    sortable: false,
  },
];

export const COMPANY_FIELDS_BY_KEY: Record<string, FieldMeta> =
  Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, f]));

export function getCompanyField(key: string): FieldMeta | null {
  return COMPANY_FIELDS_BY_KEY[key] ?? null;
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
  is_true: "is true",
  is_false: "is false",
};
