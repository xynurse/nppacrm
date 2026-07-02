import { sql, type SQL } from "drizzle-orm";
import {
  companies,
  eventCompanies,
  eventCompanyReviews,
  eventReviewers,
} from "@/lib/db/schema";
import type {
  FilterAst,
  FilterCondition,
  FilterValue,
  SortDirection,
  SortSpec,
} from "./types";
import { getCompanyField } from "./fields";

type Column = ReturnType<typeof sql.raw> extends SQL<unknown> ? unknown : never;
void 0 as Column;

function eventCompanyColumn(key: string): SQL | null {
  switch (key) {
    case "status":
      return sql`${eventCompanies.status}`;
    case "priority":
      return sql`${eventCompanies.priority}`;
    case "ownerId":
      return sql`${eventCompanies.ownerId}`;
    case "targetTierId":
      return sql`${eventCompanies.targetTierId}`;
    case "proposedAmount":
      return sql`${eventCompanies.proposedAmount}`;
    case "confirmedAmount":
      return sql`${eventCompanies.confirmedAmount}`;
    case "lastContactedAt":
      return sql`${eventCompanies.lastContactedAt}`;
    case "nextActionAt":
      return sql`${eventCompanies.nextActionAt}`;
    case "proposalValidUntil":
      return sql`${eventCompanies.proposalValidUntil}`;
    case "companyName":
      return sql`${companies.name}`;
    case "industry":
      return sql`${companies.industry}`;
    case "hqLocation":
      return sql`${companies.hqLocation}`;
    default:
      return null;
  }
}

function asString(v: FilterValue | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function asNumber(v: FilterValue | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(v: FilterValue | undefined): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.length > 0);
  }
  if (typeof v === "string" && v.length > 0) return [v];
  return [];
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function compileCondition(c: FilterCondition): SQL | null {
  const meta = getCompanyField(c.field);
  if (!meta) return null;

  // Boolean virtual-column fields
  if (c.field === "hasPendingReview") {
    const existsUnreviewed = sql`EXISTS (
      SELECT 1 FROM ${eventReviewers} er
      WHERE er.event_id = ${eventCompanies.eventId}
      AND NOT EXISTS (
        SELECT 1 FROM ${eventCompanyReviews} ecr
        WHERE ecr.event_company_id = ${eventCompanies.id}
        AND ecr.reviewer_id = er.user_id
      )
    )`;
    if (c.op === "is_true") return existsUnreviewed;
    if (c.op === "is_false") return sql`NOT EXISTS (
      SELECT 1 FROM ${eventReviewers} er
      WHERE er.event_id = ${eventCompanies.eventId}
      AND NOT EXISTS (
        SELECT 1 FROM ${eventCompanyReviews} ecr
        WHERE ecr.event_company_id = ${eventCompanies.id}
        AND ecr.reviewer_id = er.user_id
      )
    )`;
    return null;
  }

  const col = eventCompanyColumn(c.field);
  if (!col) return null;

  switch (c.op) {
    case "is_empty":
      return sql`${col} IS NULL`;
    case "is_not_empty":
      return sql`${col} IS NOT NULL`;
    case "contains": {
      const v = asString(c.value);
      if (!v) return null;
      return sql`${col} ILIKE ${`%${v}%`}`;
    }
    case "starts_with": {
      const v = asString(c.value);
      if (!v) return null;
      return sql`${col} ILIKE ${`${v}%`}`;
    }
    case "equals":
    case "is": {
      const v = asString(c.value);
      if (v == null) return null;
      return sql`${col} = ${v}`;
    }
    case "is_not": {
      const v = asString(c.value);
      if (v == null) return null;
      return sql`(${col} IS DISTINCT FROM ${v})`;
    }
    case "is_one_of": {
      const arr = asStringArray(c.value);
      if (arr.length === 0) return null;
      return sql`${col} = ANY(${arr})`;
    }
    case "eq": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`${col} = ${n}`;
    }
    case "neq": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`(${col} IS DISTINCT FROM ${n})`;
    }
    case "gt": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`${col} > ${n}`;
    }
    case "gte": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`${col} >= ${n}`;
    }
    case "lt": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`${col} < ${n}`;
    }
    case "lte": {
      const n = asNumber(c.value);
      if (n == null) return null;
      return sql`${col} <= ${n}`;
    }
    case "between": {
      if (meta.type === "date") {
        const a = asString(c.value);
        const b = asString(c.valueTo);
        if (!a || !b) return null;
        return sql`${col} BETWEEN ${a}::timestamptz AND ${b}::timestamptz`;
      }
      const a = asNumber(c.value);
      const b = asNumber(c.valueTo);
      if (a == null || b == null) return null;
      return sql`${col} BETWEEN ${a} AND ${b}`;
    }
    case "before": {
      const v = asString(c.value);
      if (!v) return null;
      return sql`${col} < ${v}::timestamptz`;
    }
    case "after": {
      const v = asString(c.value);
      if (!v) return null;
      return sql`${col} > ${v}::timestamptz`;
    }
    case "on": {
      const v = asString(c.value);
      if (!v) return null;
      return sql`${col}::date = ${v}::date`;
    }
    case "last_n_days": {
      const n = asNumber(c.value);
      if (n == null || n < 0) return null;
      const now = new Date();
      const start = startOfUtcDay(new Date(now.getTime() - n * 86400000));
      return sql`${col} >= ${start.toISOString()}::timestamptz AND ${col} <= ${now.toISOString()}::timestamptz`;
    }
    case "older_than_n_days": {
      const n = asNumber(c.value);
      if (n == null || n < 0) return null;
      const cutoff = new Date(Date.now() - n * 86400000);
      return sql`${col} < ${cutoff.toISOString()}::timestamptz`;
    }
    case "next_n_days": {
      const n = asNumber(c.value);
      if (n == null || n < 0) return null;
      const now = new Date();
      const end = new Date(startOfUtcDay(now).getTime() + (n + 1) * 86400000);
      return sql`${col} >= ${now.toISOString()}::timestamptz AND ${col} < ${end.toISOString()}::timestamptz`;
    }
    default:
      return null;
  }
}

export function compileFilter(ast: FilterAst | null | undefined): SQL | null {
  if (!ast || !ast.conditions || ast.conditions.length === 0) return null;
  const parts: SQL[] = [];
  for (const c of ast.conditions) {
    const piece = compileCondition(c);
    if (piece) parts.push(piece);
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  if (ast.op === "or") {
    return parts.reduce<SQL>(
      (acc, cur, i) => (i === 0 ? cur : sql`${acc} OR ${cur}`),
      parts[0]!,
    );
  }
  return parts.reduce<SQL>(
    (acc, cur, i) => (i === 0 ? cur : sql`${acc} AND ${cur}`),
    parts[0]!,
  );
}

export function compileSort(spec: SortSpec | null | undefined): SQL | null {
  if (!spec || spec.length === 0) return null;
  const parts: SQL[] = [];
  for (const s of spec) {
    const meta = getCompanyField(s.field);
    if (!meta || !meta.sortable) continue;
    const col = eventCompanyColumn(s.field);
    if (!col) continue;
    const dir: SortDirection = s.dir === "desc" ? "desc" : "asc";
    parts.push(
      dir === "desc"
        ? sql`${col} DESC NULLS LAST`
        : sql`${col} ASC NULLS LAST`,
    );
  }
  if (parts.length === 0) return null;
  return parts.reduce<SQL>(
    (acc, cur, i) => (i === 0 ? cur : sql`${acc}, ${cur}`),
    parts[0]!,
  );
}
