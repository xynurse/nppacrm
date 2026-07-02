import { z } from "zod";
import { COMPANY_FIELDS_BY_KEY } from "./fields";
import type { FilterAst, FilterCondition, SortSpec } from "./types";
import { EMPTY_FILTER } from "./types";

const operatorEnum = z.enum([
  "contains",
  "starts_with",
  "equals",
  "is",
  "is_not",
  "is_one_of",
  "is_empty",
  "is_not_empty",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "before",
  "after",
  "on",
  "last_n_days",
  "next_n_days",
  "older_than_n_days",
  "is_true",
  "is_false",
]);

const valueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
  z.array(z.number()),
  z.null(),
]);

const conditionSchema = z.object({
  field: z.string().min(1),
  op: operatorEnum,
  value: valueSchema.optional(),
  valueTo: valueSchema.optional(),
});

export const filterAstSchema = z.object({
  op: z.enum(["and", "or"]),
  conditions: z.array(conditionSchema).max(20),
});

export const sortSpecSchema = z
  .array(
    z.object({
      field: z.string().min(1),
      dir: z.enum(["asc", "desc"]),
    }),
  )
  .max(5);

export const viewStateSchema = z.object({
  filter: filterAstSchema,
  sort: sortSpecSchema,
  columns: z.array(z.string()).optional(),
});

const validFields = new Set(Object.keys(COMPANY_FIELDS_BY_KEY));

export function sanitizeFilter(ast: unknown): FilterAst {
  const parsed = filterAstSchema.safeParse(ast);
  if (!parsed.success) return { ...EMPTY_FILTER };
  const conditions: FilterCondition[] = [];
  for (const c of parsed.data.conditions) {
    if (!validFields.has(c.field)) continue;
    const meta = COMPANY_FIELDS_BY_KEY[c.field]!;
    if (!meta.operators.includes(c.op)) continue;
    conditions.push(c as FilterCondition);
  }
  return { op: parsed.data.op, conditions };
}

export function sanitizeSort(spec: unknown): SortSpec {
  const parsed = sortSpecSchema.safeParse(spec);
  if (!parsed.success) return [];
  return parsed.data.filter((s) => {
    const meta = COMPANY_FIELDS_BY_KEY[s.field];
    return meta?.sortable === true;
  });
}

export function decodeFromParam(param: string | null | undefined): unknown {
  if (!param) return null;
  try {
    return JSON.parse(decodeURIComponent(param));
  } catch {
    return null;
  }
}

export function encodeToParam(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

export const upsertSavedViewSchema = z.object({
  id: z.uuid().optional(),
  eventId: z.uuid(),
  name: z.string().trim().min(1).max(80),
  isShared: z.boolean().default(false),
  filter: filterAstSchema,
  sort: sortSpecSchema,
  columns: z.array(z.string()).optional(),
});

export type UpsertSavedViewInput = z.infer<typeof upsertSavedViewSchema>;

export const deleteSavedViewSchema = z.object({
  id: z.uuid(),
});
