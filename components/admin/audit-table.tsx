"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  restoreCompany,
  restoreEventCompany,
} from "@/lib/actions/restore";
import type { AuditRow } from "@/lib/db/queries/audit";

const RESTORE_ACTIONS: Record<
  string,
  (raw: { id: string }) => Promise<{ ok: boolean; error?: string } | { ok: true }>
> = {
  "eventCompany.soft_delete": restoreEventCompany,
  "company.soft_delete": restoreCompany,
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Event</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Entity</th>
            <th className="px-3 py-2 text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-zinc-900">
          {rows.map((row) => (
            <AuditRowItem
              key={row.id}
              row={row}
              open={openId === row.id}
              onToggle={() =>
                setOpenId((current) => (current === row.id ? null : row.id))
              }
            />
          ))}
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                colSpan={6}
              >
                No audit events match those filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function AuditRowItem({
  row,
  open,
  onToggle,
}: {
  row: AuditRow;
  open: boolean;
  onToggle: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [restored, setRestored] = useState(false);
  const restorer = RESTORE_ACTIONS[row.action];
  const hasChanges = useMemo(
    () => Object.keys(row.changes ?? {}).length > 0,
    [row.changes],
  );

  return (
    <>
      <tr className="align-top">
        <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.createdAt).toLocaleString()}
        </td>
        <td className="px-3 py-2">
          <div className="font-medium">{row.userName ?? "—"}</div>
          <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {row.userEmail ?? "system"}
          </div>
        </td>
        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
          {row.eventName ?? "—"}
        </td>
        <td className="px-3 py-2">
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-zinc-800 dark:text-slate-200">
            {row.action}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {row.entityType}
          </div>
          <div className="font-mono text-xs">{row.entityId}</div>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            {restorer && !restored ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await restorer({ id: row.entityId });
                    if (!result.ok) {
                      window.alert(
                        ("error" in result && result.error) || "Restore failed",
                      );
                    } else {
                      setRestored(true);
                    }
                  });
                }}
              >
                {pending ? "Restoring…" : "Restore"}
              </Button>
            ) : null}
            {restored ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                Restored
              </span>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              disabled={!hasChanges && !row.ipAddress && !row.userAgent}
            >
              {open ? "Hide" : "View"}
            </Button>
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="bg-slate-50 dark:bg-zinc-950">
          <td className="px-3 py-3" colSpan={6}>
            {hasChanges ? (
              <pre className="overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-zinc-900 dark:text-slate-200">
                {JSON.stringify(row.changes, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No structured diff captured.
              </p>
            )}
            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
              {row.ipAddress ? <div>IP: {row.ipAddress}</div> : null}
              {row.userAgent ? (
                <div className="truncate" title={row.userAgent}>
                  UA: {row.userAgent}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
