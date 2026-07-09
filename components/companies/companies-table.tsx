"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { encodeToParam } from "@/lib/views/schema";
import type { SortSpec } from "@/lib/views/types";
import { COMPANY_FIELDS_BY_KEY } from "@/lib/views/fields";
import { CellShell } from "@/components/cells/cell-shell";
import { CurrencyEditor } from "@/components/cells/currency-cell";
import { DateEditor } from "@/components/cells/date-cell";
import { PersonEditor } from "@/components/cells/person-cell";
import { TierEditor } from "@/components/cells/relation-cell";
import { SingleSelectEditor } from "@/components/cells/single-select-cell";
import type { PersonOption, TierOption } from "@/components/cells/types";
import {
  ROW_HEIGHT_BY_DENSITY,
  useDensity,
} from "@/components/providers/density-provider";
import { BulkActionBar } from "./bulk-action-bar";
import { ReviewerCell } from "./reviewer-cell";
import {
  BOUNCED_TAG,
  BouncedBadge,
  hasBouncedTag,
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "./status-badge";
import { PriorityDot } from "./priority-dot";
import { cn } from "@/lib/cn";
import {
  PROSPECT_PRIORITY_VALUES,
  PROSPECT_STATUS_VALUES,
} from "@/lib/db/schema";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import { cadenceLevel, cadenceTextClass } from "@/lib/cadence";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

type ReviewSummary = { yes: number; no: number; mine: "yes" | "no" | null };

export function CompaniesTable({
  rows: initialRows,
  activeRecordId,
  owners,
  tiers,
  isAdmin,
  reviewSummaries,
  reviewerCount,
  isReviewer,
  sort: externalSort,
  visibleColumns,
}: {
  rows: EventCompanyRow[];
  activeRecordId: string | null;
  owners: PersonOption[];
  tiers: TierOption[];
  isAdmin: boolean;
  reviewSummaries: Record<string, ReviewSummary>;
  reviewerCount: number;
  isReviewer: boolean;
  sort?: SortSpec;
  visibleColumns?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { density } = useDensity();
  const rowHeight = ROW_HEIGHT_BY_DENSITY[density];
  const [rows, setRows] = useState(initialRows);
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  // Sort-on-column-header toggle
  const toggleSort = useCallback(
    (field: string) => {
      const fieldMeta = COMPANY_FIELDS_BY_KEY[field];
      if (!fieldMeta?.sortable) return;
      const current = externalSort ?? [];
      const existing = current.find((s) => s.field === field);
      let next: SortSpec;
      if (!existing) {
        next = [{ field, dir: "asc" }];
      } else if (existing.dir === "asc") {
        next = current.map((s) => (s.field === field ? { field, dir: "desc" as const } : s));
      } else {
        next = current.filter((s) => s.field !== field);
      }
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("s");
      if (next.length > 0) sp.set("s", encodeToParam(next));
      router.push(`/companies?${sp.toString()}`, { scroll: false });
    },
    [externalSort, router, searchParams],
  );
  const tierById = useMemo(
    () => new Map(tiers.map((t) => [t.id, t])),
    [tiers],
  );

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const setRowField = useCallback(
    <K extends keyof EventCompanyRow>(
      id: string,
      key: K,
      value: EventCompanyRow[K],
    ) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
      );
    },
    [],
  );

  const setOwner = useCallback(
    (id: string, ownerId: string | null) => {
      const owner = ownerId ? owners.find((o) => o.id === ownerId) : null;
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, ownerId, ownerName: owner?.name ?? null }
            : r,
        ),
      );
    },
    [owners],
  );

  const setTargetTier = useCallback(
    (id: string, tierId: string | null) => {
      const tier = tierId ? tierById.get(tierId) : null;
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                targetTierId: tierId,
                targetTierName: tier?.name ?? null,
                targetTierColor: tier?.color ?? null,
              }
            : r,
        ),
      );
    },
    [tierById],
  );

  // Helper: render a sortable column header
  const sortHeader = useCallback(
    (field: string, label: string) => {
      const current = externalSort ?? [];
      const entry = current.find((s) => s.field === field);
      return (
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100"
        >
          {label}
          {entry ? (
            entry.dir === "asc" ? (
              <ArrowUp className="h-3 w-3 text-slate-500" />
            ) : (
              <ArrowDown className="h-3 w-3 text-slate-500" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
          )}
        </button>
      );
    },
    [externalSort, toggleSort],
  );

  const allColumns = useMemo<ColumnDef<EventCompanyRow>[]>(
    () => [
      {
        id: "_select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            aria-label="Select all"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            aria-label={`Select ${row.original.companyName}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: "companyName",
        header: () => sortHeader("companyName", "Company"),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <Link
              href={`/companies?record=${row.original.id}`}
              scroll={false}
              className="font-medium text-slate-900 hover:underline dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.companyName}
            </Link>
            {hasBouncedTag(row.original.tagsCache) ? <BouncedBadge /> : null}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => sortHeader("status", "Status"),
        cell: ({ row }) => (
          <CellShell<string | null>
            fieldKey="eventCompany.status"
            entityId={row.original.id}
            value={row.original.status}
            display={<StatusBadge status={row.original.status} />}
            onLocalChange={(v) =>
              setRowField(
                row.original.id,
                "status",
                v as EventCompanyRow["status"],
              )
            }
            Editor={(p) => (
              <SingleSelectEditor
                {...p}
                options={PROSPECT_STATUS_VALUES.map((v) => ({
                  value: v,
                  label: PROSPECT_STATUS_LABELS[v],
                }))}
              />
            )}
          />
        ),
      },
      {
        accessorKey: "priority",
        header: () => sortHeader("priority", "Priority"),
        cell: ({ row }) => (
          <CellShell<string | null>
            fieldKey="eventCompany.priority"
            entityId={row.original.id}
            value={row.original.priority}
            display={<PriorityDot priority={row.original.priority} />}
            onLocalChange={(v) =>
              setRowField(
                row.original.id,
                "priority",
                v as EventCompanyRow["priority"],
              )
            }
            Editor={(p) => (
              <SingleSelectEditor
                {...p}
                options={PROSPECT_PRIORITY_VALUES.map((v) => ({
                  value: v,
                  label: PRIORITY_LABELS[v],
                }))}
              />
            )}
          />
        ),
      },
      {
        accessorKey: "ownerId",
        header: () => sortHeader("ownerId", "Owner"),
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.ownerId"
            entityId={row.original.id}
            value={row.original.ownerId}
            display={
              row.original.ownerName ? (
                <span className="text-slate-700 dark:text-slate-300">
                  {row.original.ownerName}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )
            }
            onLocalChange={(v) => setOwner(row.original.id, v)}
            Editor={(p) => <PersonEditor {...p} options={owners} />}
          />
        ),
      },
      {
        accessorKey: "targetTierId",
        header: () => sortHeader("targetTierId", "Target tier"),
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.targetTierId"
            entityId={row.original.id}
            value={row.original.targetTierId}
            display={
              row.original.targetTierName ? (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        row.original.targetTierColor ?? "#94a3b8",
                    }}
                  />
                  {row.original.targetTierName}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )
            }
            onLocalChange={(v) => setTargetTier(row.original.id, v)}
            Editor={(p) => <TierEditor {...p} options={tiers} />}
          />
        ),
      },
      {
        accessorKey: "proposedAmount",
        header: () => (
          <span className="flex justify-end">
            {sortHeader("proposedAmount", "Proposed")}
          </span>
        ),
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.proposedAmount"
            entityId={row.original.id}
            value={row.original.proposedAmount}
            align="right"
            display={
              <span className="tabular-nums text-slate-700 dark:text-slate-300">
                {formatCurrency(
                  row.original.proposedAmount,
                  row.original.currency,
                )}
              </span>
            }
            onLocalChange={(v) =>
              setRowField(row.original.id, "proposedAmount", v)
            }
            Editor={CurrencyEditor}
          />
        ),
      },
      {
        accessorKey: "confirmedAmount",
        header: () => (
          <span className="flex justify-end">
            {sortHeader("confirmedAmount", "Confirmed")}
          </span>
        ),
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.confirmedAmount"
            entityId={row.original.id}
            value={row.original.confirmedAmount}
            align="right"
            display={
              <span className="tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(
                  row.original.confirmedAmount,
                  row.original.currency,
                )}
              </span>
            }
            onLocalChange={(v) =>
              setRowField(row.original.id, "confirmedAmount", v)
            }
            Editor={CurrencyEditor}
          />
        ),
      },
      {
        id: "review",
        header: "Review",
        cell: ({ row }) => {
          const summary = reviewSummaries[row.original.id] ?? {
            yes: 0,
            no: 0,
            mine: null,
          };
          return (
            <ReviewerCell
              eventCompanyId={row.original.id}
              myVote={summary.mine}
              yesCount={summary.yes}
              noCount={summary.no}
              reviewerCount={reviewerCount}
              canVote={isReviewer}
            />
          );
        },
      },
      {
        accessorKey: "lastContactedAt",
        header: () => sortHeader("lastContactedAt", "Last contact"),
        cell: ({ row }) => {
          const level = cadenceLevel({
            status: row.original.status,
            lastContactedAt: row.original.lastContactedAt,
          });
          return (
            <CellShell
              fieldKey="eventCompany.lastContactedAt"
              entityId={row.original.id}
              value={row.original.lastContactedAt}
              display={
                <span
                  className={`text-xs ${cadenceTextClass(level)}`}
                  title={
                    level === "red"
                      ? "30+ days since last contact"
                      : level === "amber"
                        ? "14+ days since last contact"
                        : undefined
                  }
                >
                  {formatRelativeDate(row.original.lastContactedAt)}
                </span>
              }
              onLocalChange={(v) =>
                setRowField(row.original.id, "lastContactedAt", v)
              }
              Editor={DateEditor}
            />
          );
        },
      },
      {
        accessorKey: "nextActionAt",
        header: () => sortHeader("nextActionAt", "Next action"),
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.nextActionAt"
            entityId={row.original.id}
            value={row.original.nextActionAt}
            display={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatRelativeDate(row.original.nextActionAt)}
              </span>
            }
            onLocalChange={(v) =>
              setRowField(row.original.id, "nextActionAt", v)
            }
            Editor={DateEditor}
          />
        ),
      },
      {
        id: "tags",
        header: () => <span className="text-xs">Tags</span>,
        cell: ({ row }) => {
          const tags = row.original.tagsCache;
          if (!tags || tags.length === 0)
            return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) =>
                t === BOUNCED_TAG ? (
                  <BouncedBadge key={t} />
                ) : (
                  <span
                    key={t}
                    className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    {t}
                  </span>
                ),
              )}
            </div>
          );
        },
      },
    ],
    [
      owners,
      tiers,
      setRowField,
      setOwner,
      setTargetTier,
      reviewSummaries,
      reviewerCount,
      isReviewer,
      sortHeader,
    ],
  );

  // Filter to visible columns (checkbox + company are always shown)
  const columns = useMemo(() => {
    if (!visibleColumns) return allColumns;
    return allColumns.filter((col) => {
      const id = col.id ?? ("accessorKey" in col ? String(col.accessorKey) : "");
      if (id === "_select" || id === "companyName") return true;
      return visibleColumns.includes(id);
    });
  }, [allColumns, visibleColumns]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  if (rows.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 p-12 text-center">
        <Building2
          className="h-8 w-8 text-slate-300 dark:text-slate-600"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          No prospects in this view
        </p>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Use the quick-add row above to create one, or adjust the filters if
          you expected results here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-slate-200 dark:border-slate-800"
              >
                {hg.headers.map((h) => (
                  <th key={h.id} className="group px-3 py-2 font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  rowHeight,
                  "transition-[background-color,box-shadow] duration-100",
                  activeRecordId === row.original.id
                    ? "bg-[var(--accent-tint)] shadow-[inset_2px_0_0_0_var(--accent)]"
                    : "hover:bg-slate-50 hover:shadow-[inset_2px_0_0_0_var(--hairline-strong)] dark:hover:bg-slate-800/40",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BulkActionBar
        selectedIds={selectedIds}
        owners={owners}
        isAdmin={isAdmin}
        onClear={() => setSelection({})}
      />
    </>
  );
}
