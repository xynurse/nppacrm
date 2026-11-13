"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { fetchFilteredActivity } from "@/lib/actions/dashboard";
import type {
  ActivityCategoryOption,
  ActivityRow,
} from "@/lib/db/queries/dashboard";
import { formatRelativeDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const STORAGE_KEY = "spcrm:dashboard-activity-collapsed";

type Props = {
  eventId: string;
  initialItems: ActivityRow[];
  categoryOptions: ActivityCategoryOption[];
};

export function RecentActivitySection({
  eventId,
  initialItems,
  categoryOptions,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState(initialItems);
  const [hasFilters, setHasFilters] = useState(false);
  const [isPending, startFilterTransition] = useTransition();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const o of categoryOptions) set.add(o.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [categoryOptions]);

  const subcategories = useMemo(() => {
    const set = new Set<string>();
    for (const o of categoryOptions) {
      if (category && o.category !== category) continue;
      if (o.subcategory) set.add(o.subcategory);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [categoryOptions, category]);

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  function applyFilters(next: {
    category: string;
    subcategory: string;
    from: string;
    to: string;
  }) {
    const active = Boolean(
      next.category || next.subcategory || next.from || next.to,
    );
    setHasFilters(active);
    startFilterTransition(async () => {
      const result = await fetchFilteredActivity({
        eventId,
        category: next.category || null,
        subcategory: next.subcategory || null,
        from: next.from || null,
        to: next.to || null,
      });
      if (result.ok) setItems(result.items);
    });
  }

  function onCategoryChange(value: string) {
    setCategory(value);
    // Drop subcategory when it no longer belongs to the selected category.
    const nextSub =
      value &&
      subcategory &&
      categoryOptions.some(
        (o) => o.category === value && o.subcategory === subcategory,
      )
        ? subcategory
        : "";
    setSubcategory(nextSub);
    applyFilters({ category: value, subcategory: nextSub, from, to });
  }

  function onSubcategoryChange(value: string) {
    setSubcategory(value);
    applyFilters({ category, subcategory: value, from, to });
  }

  function onFromChange(value: string) {
    setFrom(value);
    applyFilters({ category, subcategory, from: value, to });
  }

  function onToChange(value: string) {
    setTo(value);
    applyFilters({ category, subcategory, from, to: value });
  }

  function clearFilters() {
    setCategory("");
    setSubcategory("");
    setFrom("");
    setTo("");
    setHasFilters(false);
    setItems(initialItems);
    startFilterTransition(async () => {
      const result = await fetchFilteredActivity({ eventId });
      if (result.ok) setItems(result.items);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => persistCollapsed(!collapsed)}
          className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
          aria-expanded={hydrated ? !collapsed : true}
          aria-controls="dashboard-activity-panel"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          )}
          Recent activity
        </button>
        <Link
          href="/reports"
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          Reports
        </Link>
      </div>

      {!collapsed ? (
        <div id="dashboard-activity-panel" className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <FilterField label="Category" htmlFor="activity-category">
              <Select
                id="activity-category"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="h-8 min-w-[9rem] text-xs"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FilterField>

            <FilterField label="Subcategory" htmlFor="activity-subcategory">
              <Select
                id="activity-subcategory"
                value={subcategory}
                onChange={(e) => onSubcategoryChange(e.target.value)}
                className="h-8 min-w-[9rem] text-xs"
                disabled={subcategories.length === 0}
              >
                <option value="">All</option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FilterField>

            <FilterField label="From" htmlFor="activity-from">
              <Input
                id="activity-from"
                type="date"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
                className="h-8 w-[9.5rem] text-xs"
              />
            </FilterField>

            <FilterField label="To" htmlFor="activity-to">
              <Input
                id="activity-to"
                type="date"
                value={to}
                onChange={(e) => onToChange(e.target.value)}
                className="h-8 w-[9.5rem] text-xs"
              />
            </FilterField>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-zinc-500"
              >
                Clear
              </Button>
            ) : null}
          </div>

          {isPending ? (
            <ActivitySkeleton />
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {hasFilters
                ? "No activity matches these filters."
                : "No activity yet."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline gap-3 py-2.5 text-sm first:pt-0"
                >
                  <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-zinc-400">
                    {a.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/companies?record=${a.eventCompanyId}`}
                      scroll={false}
                      className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                    >
                      {a.companyName}
                    </Link>
                    {a.subject ? (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {" "}
                        — {a.subject}
                      </span>
                    ) : null}
                    {a.userName ? (
                      <span className="text-zinc-400"> · {a.userName}</span>
                    ) : null}
                    {a.category ? (
                      <span className="text-zinc-400">
                        {" "}
                        · {a.category}
                        {a.subcategory ? ` / ${a.subcategory}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-zinc-400">
                    {formatRelativeDate(a.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-wider text-zinc-400"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 py-1"
        >
          <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-14 shrink-0 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </li>
      ))}
    </ul>
  );
}
