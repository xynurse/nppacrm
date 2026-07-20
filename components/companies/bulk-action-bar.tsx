"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  bulkUpdateEventCompanies,
  softDeleteEventCompanies,
} from "@/lib/actions/cells";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PROSPECT_PRIORITY_VALUES, PROSPECT_STATUS_VALUES } from "@/lib/db/schema";
import { PROSPECT_STATUS_LABELS } from "./status-badge";
import type { PersonOption } from "@/components/cells/types";

export function BulkActionBar({
  selectedIds,
  owners,
  onClear,
  isAdmin,
}: {
  selectedIds: string[];
  owners: PersonOption[];
  onClear: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const count = selectedIds.length;
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 left-0 right-0 z-20 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-zinc-900">
      <span className="font-medium">
        {count} selected
      </span>
      <span className="text-slate-300">·</span>
      <Select
        className="h-8 w-40 text-xs"
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const status = e.target.value;
          if (!status) return;
          startTransition(async () => {
            await bulkUpdateEventCompanies({
              ids: selectedIds,
              patch: {
                status: status as (typeof PROSPECT_STATUS_VALUES)[number],
              },
            });
            router.refresh();
          });
        }}
      >
        <option value="">Set status…</option>
        {PROSPECT_STATUS_VALUES.map((s) => (
          <option key={s} value={s}>
            {PROSPECT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Select
        className="h-8 w-32 text-xs"
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const priority = e.target.value;
          if (!priority) return;
          startTransition(async () => {
            await bulkUpdateEventCompanies({
              ids: selectedIds,
              patch: {
                priority: priority as (typeof PROSPECT_PRIORITY_VALUES)[number],
              },
            });
            router.refresh();
          });
        }}
      >
        <option value="">Set priority…</option>
        {PROSPECT_PRIORITY_VALUES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select
        className="h-8 w-40 text-xs"
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          startTransition(async () => {
            await bulkUpdateEventCompanies({
              ids: selectedIds,
              patch: { ownerId: v === "__clear__" ? null : v },
            });
            router.refresh();
          });
        }}
      >
        <option value="">Set owner…</option>
        <option value="__clear__">— Clear owner —</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      {isAdmin ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                `Delete ${count} prospect${count > 1 ? "s" : ""}? They can be restored from the audit log.`,
              )
            )
              return;
            startTransition(async () => {
              await softDeleteEventCompanies({ ids: selectedIds });
              router.refresh();
              onClear();
            });
          }}
        >
          Delete
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onClear} disabled={pending}>
        Clear
      </Button>
    </div>
  );
}
