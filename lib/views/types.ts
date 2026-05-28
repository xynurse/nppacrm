export type ViewScope = "companies";

export type FilterFieldType =
  | "text"
  | "select"
  | "person"
  | "tier"
  | "currency"
  | "date"
  | "boolean";

export type TextOperator = "contains" | "starts_with" | "equals" | "is_empty" | "is_not_empty";
export type SelectOperator = "is" | "is_not" | "is_one_of" | "is_empty" | "is_not_empty";
export type DateOperator =
  | "before"
  | "after"
  | "on"
  | "between"
  | "last_n_days"
  | "next_n_days"
  | "is_empty"
  | "is_not_empty";
export type NumberOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type BooleanOperator = "is_true" | "is_false";

export type FilterOperator =
  | TextOperator
  | SelectOperator
  | DateOperator
  | NumberOperator
  | BooleanOperator;

export type FilterValue = string | number | string[] | number[] | null;

export type FilterCondition = {
  field: string;
  op: FilterOperator;
  value?: FilterValue;
  valueTo?: FilterValue;
};

export type FilterAst = {
  op: "and" | "or";
  conditions: FilterCondition[];
};

export type SortDirection = "asc" | "desc";
export type SortSpec = Array<{ field: string; dir: SortDirection }>;

export const EMPTY_FILTER: FilterAst = { op: "and", conditions: [] };

export type ViewState = {
  filter: FilterAst;
  sort: SortSpec;
  columns?: string[];
};
