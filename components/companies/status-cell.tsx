"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CellShell } from "@/components/cells/cell-shell";
import { SingleSelectEditor } from "@/components/cells/single-select-cell";
import type { TierOption } from "@/components/cells/types";
import { ConfirmModal } from "@/components/pipeline/confirm-modal";
import { confirmEventCompany } from "@/lib/actions/pipeline";
import type { EventCompanyRow } from "@/lib/db/queries/companies";
import { PROSPECT_STATUS_VALUES } from "@/lib/db/schema";
import { PROSPECT_STATUS_LABELS } from "./status-badge";

const OPTIONS = PROSPECT_STATUS_VALUES.map((v) => ({
  value: v,
  label: PROSPECT_STATUS_LABELS[v],
}));

type Status = EventCompanyRow["status"];

/**
 * Inline status editor shared by the companies table and the drawer.
 * Picking "Confirmed" opens the same amount + tier dialog as the kanban
 * instead of a bare status write, which the server would reject.
 */
export function StatusCell({
  row,
  tiers,
  display,
  onStatusChange,
  onConfirmed,
}: {
  row: EventCompanyRow;
  tiers: TierOption[];
  display: ReactNode;
  onStatusChange: (status: Status) => void;
  onConfirmed: (input: {
    confirmedAmount: string;
    confirmedTierId: string;
  }) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interceptSave = useCallback(
    (next: string | null) => {
      if (next !== "confirmed" || row.status === "confirmed") return false;
      setError(null);
      setConfirming(true);
      return true;
    },
    [row.status],
  );

  const handleConfirm = async (input: {
    confirmedAmount: string;
    confirmedTierId: string;
  }) => {
    setConfirming(false);
    const prev = row.status;
    onStatusChange("confirmed");
    const res = await confirmEventCompany({ id: row.id, ...input });
    if (!res.ok) {
      onStatusChange(prev);
      setError(res.error);
      return;
    }
    onConfirmed(input);
  };

  return (
    <>
      <CellShell<string | null>
        fieldKey="eventCompany.status"
        entityId={row.id}
        value={row.status}
        display={display}
        interceptSave={interceptSave}
        onLocalChange={(v) => onStatusChange(v as Status)}
        Editor={(p) => <SingleSelectEditor {...p} options={OPTIONS} />}
      />
      {error ? (
        <span className="mt-1 block text-[10px] text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
      {confirming ? (
        <ConfirmModal
          row={row}
          tiers={tiers}
          onCancel={() => setConfirming(false)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}
