"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
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
import { formatCurrency, formatRelativeDate } from "@/lib/format";

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export function CompaniesTable({
  rows: initialRows,
  activeRecordId,
  owners,
  tiers,
  isAdmin,
}: {
  rows: EventCompanyRow[];
  activeRecordId: string | null;
  owners: PersonOption[];
  tiers: TierOption[];
  isAdmin: boolean;
}) {
  const { density } = useDensity();
  const rowHeight = ROW_HEIGHT_BY_DENSITY[density];
  const [rows, setRows] = useState(initialRows);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
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

  const columns = useMemo<ColumnDef<EventCompanyRow>[]>(
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
        header: "Company",
        cell: ({ row }) => (
          <Link
            href={`/companies?record=${row.original.id}`}
            scroll={false}
            className="font-medium text-slate-900 hover:underline dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.companyName}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
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
        header: "Priority",
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
        header: "Owner",
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
        header: "Target tier",
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
        header: () => <span className="block text-right">Proposed</span>,
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
        header: () => <span className="block text-right">Confirmed</span>,
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
        accessorKey: "lastContactedAt",
        header: "Last contact",
        cell: ({ row }) => (
          <CellShell
            fieldKey="eventCompany.lastContactedAt"
            entityId={row.original.id}
            value={row.original.lastContactedAt}
            display={
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatRelativeDate(row.original.lastContactedAt)}
              </span>
            }
            onLocalChange={(v) =>
              setRowField(row.original.id, "lastContactedAt", v)
            }
            Editor={DateEditor}
          />
        ),
      },
      {
        accessorKey: "nextActionAt",
        header: "Next action",
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
    ],
    [owners, tiers, setRowField, setOwner, setTargetTier],
  );

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
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No prospects yet. Use the quick-add row above to create one.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-slate-200 dark:border-slate-800"
              >
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-medium">
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
                  "transition-colors",
                  activeRecordId === row.original.id
                    ? "bg-slate-50 dark:bg-slate-800/60"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40",
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
