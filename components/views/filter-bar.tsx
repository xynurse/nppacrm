"use client";

import { ArrowUpDown, Filter, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  COMPANY_FIELDS,
  COMPANY_FIELDS_BY_KEY,
  OPERATOR_LABELS,
  type FieldMeta,
  type FieldOption,
} from "@/lib/views/fields";
import type {
  FilterAst,
  FilterCondition,
  FilterOperator,
  FilterValue,
  SortSpec,
} from "@/lib/views/types";

type Props = {
  filter: FilterAst;
  sort: SortSpec;
  onChange: (next: { filter: FilterAst; sort: SortSpec }) => void;
  ownerOptions: FieldOption[];
  tierOptions: FieldOption[];
  resultCount: number;
};

function defaultValueFor(meta: FieldMeta, op: FilterOperator): FilterValue {
  if (op === "is_empty" || op === "is_not_empty") return null;
  if (op === "is_true" || op === "is_false") return null;
  if (meta.type === "boolean") return null;
  if (op === "is_one_of") return [];
  if (meta.type === "currency") return "";
  if (meta.type === "date") return "";
  return meta.options?.[0]?.value ?? "";
}

function getOptionsForField(
  meta: FieldMeta,
  ownerOptions: FieldOption[],
  tierOptions: FieldOption[],
): FieldOption[] {
  if (meta.type === "person") return ownerOptions;
  if (meta.type === "tier") return tierOptions;
  return meta.options ?? [];
}

function describeValue(
  meta: FieldMeta,
  cond: FilterCondition,
  ownerOptions: FieldOption[],
  tierOptions: FieldOption[],
): string {
  if (cond.op === "is_empty" || cond.op === "is_not_empty") return "";
  if (cond.op === "is_true" || cond.op === "is_false") return "";
  const options = getOptionsForField(meta, ownerOptions, tierOptions);
  const optionLabel = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v;
  if (cond.op === "is_one_of" && Array.isArray(cond.value)) {
    return (cond.value as string[]).map(optionLabel).join(", ") || "—";
  }
  if (cond.op === "between") {
    const a = String(cond.value ?? "");
    const b = String(cond.valueTo ?? "");
    return `${a || "?"} – ${b || "?"}`;
  }
  if (meta.type === "select" || meta.type === "person" || meta.type === "tier") {
    return cond.value != null ? optionLabel(String(cond.value)) : "—";
  }
  return cond.value != null && cond.value !== "" ? String(cond.value) : "—";
}

export function FilterBar({
  filter,
  sort,
  onChange,
  ownerOptions,
  tierOptions,
  resultCount,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const setConditions = (next: FilterCondition[]) =>
    onChange({ filter: { op: filter.op, conditions: next }, sort });

  const toggleOp = () =>
    onChange({
      filter: { op: filter.op === "and" ? "or" : "and", conditions: filter.conditions },
      sort,
    });

  const setSort = (next: SortSpec) =>
    onChange({ filter, sort: next });

  const updateCondition = (index: number, patch: Partial<FilterCondition>) => {
    const next = filter.conditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    setConditions(next);
  };

  const removeCondition = (index: number) => {
    setConditions(filter.conditions.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const addCondition = (fieldKey: string) => {
    const meta = COMPANY_FIELDS_BY_KEY[fieldKey];
    if (!meta) return;
    const op = meta.operators[0]!;
    const newCond: FilterCondition = {
      field: fieldKey,
      op,
      value: defaultValueFor(meta, op),
    };
    const nextIndex = filter.conditions.length;
    setConditions([...filter.conditions, newCond]);
    setEditingIndex(nextIndex);
    setAdding(false);
  };

  const clearAll = () => {
    onChange({ filter: { op: "and", conditions: [] }, sort: [] });
    setEditingIndex(null);
  };

  const sortable = COMPANY_FIELDS.filter((f) => f.sortable);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
      <Filter className="h-3.5 w-3.5 text-slate-400" />

      {filter.conditions.map((cond, i) => {
        const meta = COMPANY_FIELDS_BY_KEY[cond.field];
        if (!meta) return null;
        const valueStr = describeValue(meta, cond, ownerOptions, tierOptions);
        return (
          <div key={i} className="flex items-center gap-1">
            {/* AND/OR connector between conditions */}
            {i > 0 ? (
              <button
                type="button"
                onClick={toggleOp}
                title="Click to toggle AND / OR"
                className="rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                {filter.op}
              </button>
            ) : null}

            <div className="relative">
              <button
                type="button"
                onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span className="font-medium">{meta.label}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {OPERATOR_LABELS[cond.op]}
                </span>
                {valueStr ? (
                  <span className="text-slate-700 dark:text-slate-200">
                    {valueStr}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCondition(i);
                  }}
                  aria-label="Remove filter"
                  className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-300 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </button>

              {editingIndex === i ? (
                <ConditionEditor
                  meta={meta}
                  cond={cond}
                  ownerOptions={ownerOptions}
                  tierOptions={tierOptions}
                  onChange={(patch) => updateCondition(i, patch)}
                  onClose={() => setEditingIndex(null)}
                />
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAdding((v) => !v)}
          className="h-6 px-2 text-xs text-slate-600 dark:text-slate-300"
        >
          <Plus className="h-3 w-3" />
          Add filter
        </Button>
        {adding ? (
          <FieldPicker
            onPick={addCondition}
            onClose={() => setAdding(false)}
          />
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {resultCount} {resultCount === 1 ? "row" : "rows"}
        </span>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSortOpen((v) => !v)}
            className="h-6 px-2 text-xs text-slate-600 dark:text-slate-300"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sort.length > 0
              ? `Sorted: ${sort.length}`
              : "Sort"}
          </Button>
          {sortOpen ? (
            <SortMenu
              sort={sort}
              fields={sortable}
              onChange={setSort}
              onClose={() => setSortOpen(false)}
            />
          ) : null}
        </div>
        {filter.conditions.length > 0 || sort.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs text-slate-500 dark:text-slate-400"
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FieldPicker({
  onPick,
  onClose,
}: {
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {COMPANY_FIELDS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onPick(f.key)}
          className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function ConditionEditor({
  meta,
  cond,
  ownerOptions,
  tierOptions,
  onChange,
  onClose,
}: {
  meta: FieldMeta;
  cond: FilterCondition;
  ownerOptions: FieldOption[];
  tierOptions: FieldOption[];
  onChange: (patch: Partial<FilterCondition>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  const options = useMemo(
    () => getOptionsForField(meta, ownerOptions, tierOptions),
    [meta, ownerOptions, tierOptions],
  );
  const showsValue =
    cond.op !== "is_empty" &&
    cond.op !== "is_not_empty" &&
    cond.op !== "is_true" &&
    cond.op !== "is_false" &&
    meta.type !== "boolean";
  const isMulti = cond.op === "is_one_of";
  const isBetween = cond.op === "between";

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-20 mt-1 w-72 space-y-2 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <Select
        className="h-8 text-xs"
        value={cond.op}
        onChange={(e) => {
          const op = e.target.value as FilterOperator;
          onChange({ op, value: defaultValueFor(meta, op), valueTo: undefined });
        }}
      >
        {meta.operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </Select>

      {showsValue ? (
        isMulti ? (
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5 dark:border-slate-700">
            {options.length === 0 ? (
              <p className="px-1 text-xs text-slate-500">No options</p>
            ) : (
              options.map((opt) => {
                const checked = Array.isArray(cond.value)
                  ? (cond.value as string[]).includes(opt.value)
                  : false;
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={checked}
                      onChange={(e) => {
                        const cur = Array.isArray(cond.value)
                          ? [...(cond.value as string[])]
                          : [];
                        const next = e.target.checked
                          ? [...new Set([...cur, opt.value])]
                          : cur.filter((v) => v !== opt.value);
                        onChange({ value: next });
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        ) : meta.type === "select" ||
          meta.type === "person" ||
          meta.type === "tier" ? (
          <Select
            className="h-8 text-xs"
            value={(cond.value as string) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          >
            <option value="">— Select —</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        ) : isBetween ? (
          <div className="grid grid-cols-2 gap-1.5">
            <Input
              className="h-8 text-xs"
              type={meta.type === "date" ? "date" : "number"}
              value={(cond.value as string | number | null) ?? ""}
              onChange={(e) => onChange({ value: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              type={meta.type === "date" ? "date" : "number"}
              value={(cond.valueTo as string | number | null) ?? ""}
              onChange={(e) => onChange({ valueTo: e.target.value })}
            />
          </div>
        ) : meta.type === "date" &&
          (cond.op === "last_n_days" || cond.op === "next_n_days") ? (
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            placeholder="N days"
            value={(cond.value as string | number | null) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        ) : meta.type === "date" ? (
          <Input
            className="h-8 text-xs"
            type="date"
            value={(cond.value as string | null) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        ) : meta.type === "currency" ? (
          <Input
            className="h-8 text-xs"
            type="number"
            inputMode="decimal"
            value={(cond.value as string | number | null) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        ) : (
          <Input
            className="h-8 text-xs"
            type="text"
            value={(cond.value as string | null) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        )
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 px-2 text-xs"
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function SortMenu({
  sort,
  fields,
  onChange,
  onClose,
}: {
  sort: SortSpec;
  fields: FieldMeta[];
  onChange: (next: SortSpec) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);
  const used = new Set(sort.map((s) => s.field));

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-20 mt-1 w-72 space-y-1.5 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {sort.length === 0 ? (
        <p className="px-1 text-xs text-slate-500">No sort applied</p>
      ) : (
        sort.map((s, i) => {
          const meta = COMPANY_FIELDS_BY_KEY[s.field];
          if (!meta) return null;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="flex-1 text-xs">{meta.label}</span>
              <Select
                className="h-7 w-20 text-xs"
                value={s.dir}
                onChange={(e) => {
                  const next = sort.map((x, j) =>
                    j === i ? { ...x, dir: e.target.value as "asc" | "desc" } : x,
                  );
                  onChange(next);
                }}
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </Select>
              <button
                type="button"
                onClick={() => onChange(sort.filter((_, j) => j !== i))}
                aria-label="Remove sort"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })
      )}
      <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
        <Select
          className="h-7 text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onChange([...sort, { field: v, dir: "asc" }]);
          }}
        >
          <option value="">+ Add sort field</option>
          {fields
            .filter((f) => !used.has(f.key))
            .map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [ref, onClose]);
}
