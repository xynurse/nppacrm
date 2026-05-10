"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TierOption } from "@/components/cells/types";
import type { EventCompanyRow } from "@/lib/db/queries/companies";

type Props = {
  row: EventCompanyRow;
  tiers: TierOption[];
  onCancel: () => void;
  onConfirm: (input: { confirmedAmount: string; confirmedTierId: string }) => void;
};

export function ConfirmModal({ row, tiers, onCancel, onConfirm }: Props) {
  const [amount, setAmount] = useState(
    row.confirmedAmount ?? row.proposedAmount ?? "",
  );
  const [tierId, setTierId] = useState(
    row.confirmedTierId ?? row.targetTierId ?? tiers[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const valid =
    /^\d+(\.\d{1,2})?$/.test(amount.trim()) &&
    Number(amount) > 0 &&
    tierId.length > 0;

  const submit = () => {
    if (!valid) {
      setError("Enter a positive amount and pick a tier");
      return;
    }
    onConfirm({ confirmedAmount: amount.trim(), confirmedTierId: tierId });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Confirm sponsorship
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {row.companyName}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-amount">Confirmed amount (USD)</Label>
          <Input
            id="confirm-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-tier">Confirmed tier</Label>
          <Select
            id="confirm-tier"
            value={tierId}
            onChange={(e) => setTierId(e.target.value)}
          >
            {tiers.length === 0 ? <option value="">No tiers</option> : null}
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!valid}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
