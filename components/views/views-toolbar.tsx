"use client";

import { Columns3 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import type { FieldMeta, FieldOption } from "@/lib/views/fields";
import { encodeToParam } from "@/lib/views/schema";
import type { FilterAst, SortSpec } from "@/lib/views/types";
import { EMPTY_FILTER } from "@/lib/views/types";
import type { SavedView } from "@/lib/db/schema";
import {
  COMPANY_COLUMNS,
  DEFAULT_COLUMNS,
  type ColumnDef,
} from "@/lib/views/columns";
import { ExportButton } from "./export-button";
import { FilterBar } from "./filter-bar";
import { ViewSwitcher } from "./view-switcher";

type Props = {
  eventId: string;
  views: SavedView[];
  initialFilter: FilterAst;
  initialSort: SortSpec;
  initialViewId: string | null;
  initialColumns?: string[];
  ownerOptions: FieldOption[];
  tierOptions: FieldOption[];
  resultCount: number;
  isAdmin: boolean;
  extraColumns?: ColumnDef[];
  extraFields?: FieldMeta[];
};

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function ViewsToolbar({
  eventId,
  views,
  initialFilter,
  initialSort,
  initialViewId,
  initialColumns,
  ownerOptions,
  tierOptions,
  resultCount,
  isAdmin,
  extraColumns = [],
  extraFields = [],
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [filter, setFilter] = useState<FilterAst>(initialFilter);
  const [sort, setSort] = useState<SortSpec>(initialSort);
  const [viewId, setViewId] = useState<string | null>(initialViewId);
  const [columns, setColumns] = useState<string[]>(
    initialColumns ?? DEFAULT_COLUMNS,
  );
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilter(initialFilter);
    setSort(initialSort);
    setViewId(initialViewId);
    setColumns(initialColumns ?? DEFAULT_COLUMNS);
  }, [initialFilter, initialSort, initialViewId, initialColumns]);

  // Close column picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setColPickerOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setColPickerOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const activeView = useMemo(
    () => views.find((v) => v.id === viewId) ?? null,
    [views, viewId],
  );

  const isDirty = useMemo(() => {
    if (!activeView) return false;
    const viewColumns = activeView.columns?.length
      ? activeView.columns
      : DEFAULT_COLUMNS;
    return (
      !jsonEqual(activeView.filter, filter) ||
      !jsonEqual(activeView.sort, sort) ||
      !jsonEqual([...viewColumns].sort(), [...columns].sort())
    );
  }, [activeView, filter, sort, columns]);

  const pushUrl = useCallback(
    (next: {
      filter: FilterAst;
      sort: SortSpec;
      viewId: string | null;
      columns?: string[];
    }) => {
      const sp = new URLSearchParams(params.toString());
      const record = sp.get("record");

      sp.delete("view");
      sp.delete("f");
      sp.delete("s");
      sp.delete("col");

      if (next.viewId) sp.set("view", next.viewId);
      const view = views.find((v) => v.id === next.viewId) ?? null;
      const filterDirty = !view || !jsonEqual(view.filter, next.filter);
      const sortDirty = !view || !jsonEqual(view.sort, next.sort);

      if (next.filter.conditions.length > 0 && filterDirty) {
        sp.set("f", encodeToParam(next.filter));
      }
      if (next.sort.length > 0 && sortDirty) {
        sp.set("s", encodeToParam(next.sort));
      }

      // Only set col param if it differs from default
      const cols = next.columns ?? columns;
      if (!jsonEqual([...cols].sort(), [...DEFAULT_COLUMNS].sort())) {
        sp.set("col", encodeToParam(cols));
      }

      if (record) sp.set("record", record);

      router.push(`/companies?${sp.toString()}`, { scroll: false });
    },
    [params, router, views, columns],
  );

  const handleFilterChange = (next: { filter: FilterAst; sort: SortSpec }) => {
    setFilter(next.filter);
    setSort(next.sort);
    pushUrl({ filter: next.filter, sort: next.sort, viewId });
  };

  const handleSelectView = (view: SavedView | null) => {
    if (!view) {
      setFilter(EMPTY_FILTER);
      setSort([]);
      setViewId(null);
      pushUrl({ filter: EMPTY_FILTER, sort: [], viewId: null });
      return;
    }
    const nextColumns = view.columns?.length ? view.columns : DEFAULT_COLUMNS;
    setFilter(view.filter);
    setSort(view.sort);
    setColumns(nextColumns);
    setViewId(view.id);
    pushUrl({
      filter: view.filter,
      sort: view.sort,
      viewId: view.id,
      columns: nextColumns,
    });
  };

  const handleSavedNew = (id: string) => {
    setViewId(id);
    pushUrl({ filter, sort, viewId: id });
    router.refresh();
  };

  const handleColumnToggle = (key: string, pinned: boolean) => {
    if (pinned) return; // can't hide pinned columns
    const next = columns.includes(key)
      ? columns.filter((c) => c !== key)
      : [...columns, key];
    setColumns(next);
    pushUrl({ filter, sort, viewId, columns: next });
  };

  const hiddenCount = DEFAULT_COLUMNS.filter((k) => !columns.includes(k)).length;

  const columnToggle = (col: ColumnDef) => {
    const visible = columns.includes(col.key);
    return (
      <label
        key={col.key}
        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 ${
          col.pinned ? "opacity-50" : ""
        }`}
      >
        <input
          type="checkbox"
          className="h-3.5 w-3.5"
          checked={visible}
          disabled={col.pinned}
          onChange={() => handleColumnToggle(col.key, col.pinned ?? false)}
        />
        <span className="text-slate-700 dark:text-slate-200">{col.label}</span>
        {col.pinned ? (
          <span className="ml-auto text-[9px] text-slate-400">always</span>
        ) : null}
      </label>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search companies, contacts, notes…"
          className="w-full sm:w-64"
        />
        <div className="flex items-center gap-1">
          {(
            [
              { label: "Bounced", value: "BOUNCED" },
              { label: "Deferred", value: "DEFERRED" },
            ] as const
          ).map((chip) => {
            const active = filter.conditions.some(
              (c) =>
                c.field === "tags" &&
                c.op === "contains" &&
                c.value === chip.value,
            );
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  const nextConditions = active
                    ? filter.conditions.filter(
                        (c) =>
                          !(
                            c.field === "tags" &&
                            c.op === "contains" &&
                            c.value === chip.value
                          ),
                      )
                    : [
                        ...filter.conditions.filter(
                          (c) =>
                            !(
                              c.field === "tags" &&
                              c.op === "contains" &&
                              (c.value === "BOUNCED" || c.value === "DEFERRED")
                            ),
                        ),
                        {
                          field: "tags",
                          op: "contains" as const,
                          value: chip.value,
                        },
                      ];
                  const next = { ...filter, conditions: nextConditions };
                  setFilter(next);
                  setViewId(null);
                  pushUrl({ filter: next, sort, viewId: null });
                }}
                className={
                  active
                    ? "h-8 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "h-8 rounded-md border border-zinc-200 px-2.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <ViewSwitcher
          eventId={eventId}
          views={views}
          activeViewId={viewId}
          filter={filter}
          sort={sort}
          isAdmin={isAdmin}
          isDirty={isDirty}
          columns={columns}
          onSelectView={handleSelectView}
          onSavedNew={handleSavedNew}
        />

        {/* Column picker */}
        <div ref={colPickerRef} className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setColPickerOpen((v) => !v)}
            className="h-8 gap-1.5 text-xs"
          >
            <Columns3 className="h-3.5 w-3.5" />
            Columns
            {hiddenCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                {hiddenCount} hidden
              </span>
            ) : null}
          </Button>

          {colPickerOpen ? (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-80 w-56 space-y-0.5 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-zinc-900">
              {COMPANY_COLUMNS.filter((col) => !col.optional).map((col) =>
                columnToggle(col),
              )}
              <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                More fields
              </p>
              {COMPANY_COLUMNS.filter((col) => col.optional).map((col) =>
                columnToggle(col),
              )}
              {extraColumns.length > 0 ? (
                <>
                  <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Custom
                  </p>
                  {extraColumns.map((col) => columnToggle(col))}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ml-auto">
          <ExportButton eventId={eventId} filter={filter} sort={sort} />
        </div>
      </div>
      <FilterBar
        filter={filter}
        sort={sort}
        onChange={handleFilterChange}
        ownerOptions={ownerOptions}
        tierOptions={tierOptions}
        resultCount={resultCount}
        extraFields={extraFields}
      />
    </div>
  );
}
