"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateField } from "@/lib/actions/cells";
import type { FulfillmentRow } from "@/lib/db/queries/fulfillment";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hasDate(v: Date | string | null): boolean {
  return v != null && v !== "";
}

export function FulfillmentBoard({ rows }: { rows: FulfillmentRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(rows);

  const toggleDate = (
    id: string,
    field: "agreementSignedAt" | "invoiceSentAt" | "paidAt",
    current: Date | null,
  ) => {
    const next = current ? null : todayIso();
    setLocal((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: next ? new Date(`${next}T12:00:00.000Z`) : null,
            }
          : r,
      ),
    );
    startTransition(async () => {
      const res = await updateField({
        entityId: id,
        fieldKey: `eventCompany.${field}`,
        value: next,
      });
      if (!res.ok) {
        alert(res.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  };

  const saveText = (
    id: string,
    field: "boothNumber" | "repNames",
    value: string,
  ) => {
    const trimmed = value.trim() || null;
    setLocal((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: trimmed } : r)),
    );
    startTransition(async () => {
      const res = await updateField({
        entityId: id,
        fieldKey: `eventCompany.${field}`,
        value: trimmed,
      });
      if (!res.ok) {
        alert(res.error);
        router.refresh();
      }
    });
  };

  if (local.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No confirmed sponsors yet. Mark companies confirmed on Pipeline or
        Companies to see them here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th className="px-3 py-2.5">Sponsor</th>
            <th className="px-3 py-2.5">Tier</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="px-3 py-2.5 text-center">Agreement</th>
            <th className="px-3 py-2.5 text-center">Invoice</th>
            <th className="px-3 py-2.5 text-center">Paid</th>
            <th className="px-3 py-2.5">Booth</th>
            <th className="px-3 py-2.5">Reps</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {local.map((r) => {
            const done =
              [r.agreementSignedAt, r.invoiceSentAt, r.paidAt].filter(hasDate)
                .length;
            return (
              <tr
                key={r.id}
                className={cn(
                  "transition-colors",
                  done === 3 ? "bg-emerald-50/40" : undefined,
                )}
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/companies?record=${r.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {r.companyName}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  {r.tierName ? (
                    <span className="inline-flex items-center gap-1.5 text-zinc-700">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: r.tierColor ?? "#94a3b8" }}
                      />
                      {r.tierName}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                  {r.confirmedAmount
                    ? formatCurrency(r.confirmedAmount, r.currency)
                    : "—"}
                </td>
                {(
                  [
                    ["agreementSignedAt", r.agreementSignedAt],
                    ["invoiceSentAt", r.invoiceSentAt],
                    ["paidAt", r.paidAt],
                  ] as const
                ).map(([field, value]) => (
                  <td key={field} className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleDate(r.id, field, value)}
                      className={cn(
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium",
                        hasDate(value)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 text-zinc-500 hover:bg-zinc-50",
                      )}
                      title={
                        hasDate(value)
                          ? "Click to clear"
                          : "Click to mark done today"
                      }
                    >
                      {hasDate(value) ? "✓" : "—"}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Input
                    className="h-8 w-20"
                    defaultValue={r.boothNumber ?? ""}
                    disabled={pending}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (r.boothNumber ?? "")) {
                        saveText(r.id, "boothNumber", e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="h-8 min-w-[8rem]"
                    defaultValue={r.repNames ?? ""}
                    disabled={pending}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (r.repNames ?? "")) {
                        saveText(r.id, "repNames", e.target.value);
                      }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
