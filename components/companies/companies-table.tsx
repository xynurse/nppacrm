"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import {
  ROW_HEIGHT_BY_DENSITY,
  useDensity,
} from "@/components/providers/density-provider";
import { PriorityDot } from "./priority-dot";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/cn";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import { formatCurrency, formatRelativeDate } from "@/lib/format";

export function CompaniesTable({
  rows,
  activeRecordId,
}: {
  rows: EventCompanyRow[];
  activeRecordId: string | null;
}) {
  const { density } = useDensity();
  const rowHeight = ROW_HEIGHT_BY_DENSITY[density];

  const columns = useMemo<ColumnDef<EventCompanyRow>[]>(
    () => [
      {
        accessorKey: "companyName",
        header: "Company",
        cell: ({ row }) => (
          <Link
            href={`/companies?record=${row.original.id}`}
            scroll={false}
            className="font-medium text-slate-900 hover:underline dark:text-slate-100"
          >
            {row.original.companyName}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityDot priority={row.original.priority} />,
      },
      {
        accessorKey: "ownerName",
        header: "Owner",
        cell: ({ row }) =>
          row.original.ownerName ? (
            <span className="text-slate-700 dark:text-slate-300">
              {row.original.ownerName}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        accessorKey: "targetTierName",
        header: "Target tier",
        cell: ({ row }) => {
          const t = row.original.targetTierName;
          if (!t)
            return <span className="text-slate-400">—</span>;
          return (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: row.original.targetTierColor ?? "#94a3b8",
                }}
              />
              {t}
            </span>
          );
        },
      },
      {
        accessorKey: "proposedAmount",
        header: "Proposed",
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-slate-700 dark:text-slate-300">
            {formatCurrency(row.original.proposedAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "confirmedAmount",
        header: "Confirmed",
        cell: ({ row }) => (
          <span className="text-right tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(
              row.original.confirmedAmount,
              row.original.currency,
            )}
          </span>
        ),
      },
      {
        accessorKey: "lastContactedAt",
        header: "Last contact",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatRelativeDate(row.original.lastContactedAt)}
          </span>
        ),
      },
      {
        accessorKey: "nextActionAt",
        header: "Next action",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatRelativeDate(row.original.nextActionAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No prospects yet. Add one inline (chunk 4) or import the Master List
          CSV (chunk 10).
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-slate-200 dark:border-slate-800">
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
  );
}
