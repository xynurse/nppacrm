"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldOption } from "@/lib/views/fields";
import { encodeToParam } from "@/lib/views/schema";
import type { FilterAst, SortSpec } from "@/lib/views/types";
import { EMPTY_FILTER } from "@/lib/views/types";
import type { SavedView } from "@/lib/db/schema";
import { FilterBar } from "./filter-bar";
import { ViewSwitcher } from "./view-switcher";

type Props = {
  eventId: string;
  views: SavedView[];
  initialFilter: FilterAst;
  initialSort: SortSpec;
  initialViewId: string | null;
  ownerOptions: FieldOption[];
  tierOptions: FieldOption[];
  resultCount: number;
  isAdmin: boolean;
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
  ownerOptions,
  tierOptions,
  resultCount,
  isAdmin,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [filter, setFilter] = useState<FilterAst>(initialFilter);
  const [sort, setSort] = useState<SortSpec>(initialSort);
  const [viewId, setViewId] = useState<string | null>(initialViewId);

  useEffect(() => {
    setFilter(initialFilter);
    setSort(initialSort);
    setViewId(initialViewId);
  }, [initialFilter, initialSort, initialViewId]);

  const activeView = useMemo(
    () => views.find((v) => v.id === viewId) ?? null,
    [views, viewId],
  );

  const isDirty = useMemo(() => {
    if (!activeView) return false;
    return (
      !jsonEqual(activeView.filter, filter) || !jsonEqual(activeView.sort, sort)
    );
  }, [activeView, filter, sort]);

  const pushUrl = useCallback(
    (next: { filter: FilterAst; sort: SortSpec; viewId: string | null }) => {
      const sp = new URLSearchParams(params.toString());
      const record = sp.get("record");

      sp.delete("view");
      sp.delete("f");
      sp.delete("s");

      if (next.viewId) sp.set("view", next.viewId);
      const view = views.find((v) => v.id === next.viewId) ?? null;
      const filterDirty =
        !view || !jsonEqual(view.filter, next.filter);
      const sortDirty = !view || !jsonEqual(view.sort, next.sort);

      if (next.filter.conditions.length > 0 && filterDirty) {
        sp.set("f", encodeToParam(next.filter));
      }
      if (next.sort.length > 0 && sortDirty) {
        sp.set("s", encodeToParam(next.sort));
      }
      if (record) sp.set("record", record);

      router.push(`/companies?${sp.toString()}`, { scroll: false });
    },
    [params, router, views],
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
    setFilter(view.filter);
    setSort(view.sort);
    setViewId(view.id);
    pushUrl({ filter: view.filter, sort: view.sort, viewId: view.id });
  };

  const handleSavedNew = (id: string) => {
    setViewId(id);
    pushUrl({ filter, sort, viewId: id });
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ViewSwitcher
          eventId={eventId}
          views={views}
          activeViewId={viewId}
          filter={filter}
          sort={sort}
          isAdmin={isAdmin}
          isDirty={isDirty}
          onSelectView={handleSelectView}
          onSavedNew={handleSavedNew}
        />
      </div>
      <FilterBar
        filter={filter}
        sort={sort}
        onChange={handleFilterChange}
        ownerOptions={ownerOptions}
        tierOptions={tierOptions}
        resultCount={resultCount}
      />
    </div>
  );
}
