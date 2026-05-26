"use client";

import { Gift, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  deleteBenefit,
  instantiateBenefits,
  syncBenefitsFromTier,
  updateBenefitDueAt,
  updateBenefitNote,
  updateBenefitStatus,
} from "@/lib/actions/benefits";
import type { BenefitRow } from "@/lib/db/queries/benefits";
import {
  BENEFIT_STATUS_LABELS,
  BENEFIT_STATUS_VALUES,
  type BenefitStatus,
} from "@/lib/db/schema";

type Props = {
  eventCompanyId: string;
  benefits: BenefitRow[];
  hasConfirmedTier: boolean;
  confirmedTierName: string | null;
};

export function BenefitsTab({
  eventCompanyId,
  benefits,
  hasConfirmedTier,
  confirmedTierName,
}: Props) {
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleInstantiate = () => {
    setError(null);
    setInfo(null);
    startPending(async () => {
      const res = await instantiateBenefits({ eventCompanyId });
      if (!res.ok) {
        setError(res.error);
      } else {
        setInfo(
          `Created ${res.created} new benefit${res.created === 1 ? "" : "s"} from ${confirmedTierName ?? "the confirmed tier"}.`,
        );
      }
    });
  };

  const handleSync = () => {
    setError(null);
    setInfo(null);
    startPending(async () => {
      const res = await syncBenefitsFromTier({ eventCompanyId });
      if (!res.ok) {
        setError(res.error);
      } else {
        setInfo(
          res.created === 0
            ? "Already in sync with the tier."
            : `Added ${res.created} new benefit${res.created === 1 ? "" : "s"} from the tier (existing rows unchanged).`,
        );
      }
    });
  };

  const counts = {
    pending: benefits.filter((b) => b.status === "pending").length,
    in_progress: benefits.filter((b) => b.status === "in_progress").length,
    delivered: benefits.filter((b) => b.status === "delivered").length,
    skipped: benefits.filter((b) => b.status === "skipped").length,
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-emerald-500" />
              Benefits delivery
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hasConfirmedTier
                ? `Tracking ${benefits.length} deliverable${benefits.length === 1 ? "" : "s"}${confirmedTierName ? ` from ${confirmedTierName}` : ""}.`
                : "Set a confirmed tier on this prospect before benefits can be tracked."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {benefits.length === 0 ? (
              <Button
                size="sm"
                onClick={handleInstantiate}
                disabled={!hasConfirmedTier || pending}
              >
                Instantiate from tier
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={!hasConfirmedTier || pending}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Sync from tier
              </Button>
            )}
          </div>
        </div>
        {benefits.length > 0 ? (
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <Badge count={counts.pending} color="slate" label="pending" />
            <Badge count={counts.in_progress} color="amber" label="in progress" />
            <Badge count={counts.delivered} color="emerald" label="delivered" />
            {counts.skipped > 0 ? (
              <Badge count={counts.skipped} color="slate" label="skipped" />
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {info}
          </p>
        ) : null}
      </section>

      {benefits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {hasConfirmedTier
            ? "No benefits yet. Click \"Instantiate from tier\" above to copy the tier's checklist onto this prospect."
            : "Choose a confirmed tier (Overview tab) and the checklist will appear here automatically."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {benefits.map((b) => (
            <BenefitRowItem key={b.id} benefit={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({
  count,
  color,
  label,
}: {
  count: number;
  color: "slate" | "amber" | "emerald";
  label: string;
}) {
  const cls =
    color === "emerald"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : color === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {count} {label}
    </span>
  );
}

function BenefitRowItem({ benefit }: { benefit: BenefitRow }) {
  const [pending, startPending] = useTransition();
  const [localDue, setLocalDue] = useState(benefit.dueAt ?? "");
  const [localNote, setLocalNote] = useState(benefit.note ?? "");
  const [status, setStatus] = useState<BenefitStatus>(benefit.status);
  const [error, setError] = useState<string | null>(null);

  const isOverdue =
    status !== "delivered" &&
    status !== "skipped" &&
    benefit.dueAt &&
    new Date(`${benefit.dueAt}T23:59:59`) < new Date();

  const updateStatus = (next: BenefitStatus) => {
    setStatus(next);
    setError(null);
    startPending(async () => {
      const res = await updateBenefitStatus({ id: benefit.id, status: next });
      if (!res.ok) {
        setStatus(benefit.status);
        setError(res.error);
      }
    });
  };

  const persistDue = () => {
    if (localDue === (benefit.dueAt ?? "")) return;
    const nextDue = localDue.trim() === "" ? null : localDue;
    startPending(async () => {
      const res = await updateBenefitDueAt({
        id: benefit.id,
        dueAt: nextDue,
      });
      if (!res.ok) {
        setError(res.error);
        setLocalDue(benefit.dueAt ?? "");
      }
    });
  };

  const persistNote = () => {
    if (localNote === (benefit.note ?? "")) return;
    startPending(async () => {
      const res = await updateBenefitNote({
        id: benefit.id,
        note: localNote.trim() === "" ? null : localNote,
      });
      if (!res.ok) {
        setError(res.error);
        setLocalNote(benefit.note ?? "");
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${benefit.label}"?`)) return;
    startPending(async () => {
      const res = await deleteBenefit({ id: benefit.id });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        status === "delivered"
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : isOverdue
            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
            : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{benefit.label}</span>
            {benefit.tierName ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                title={`Tier: ${benefit.tierName}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: benefit.tierColor ?? "#94a3b8" }}
                />
                {benefit.tierName}
              </span>
            ) : null}
            <span className="font-mono text-[10px] text-slate-400">
              {benefit.benefitKey}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Select
            className="h-7 w-32 text-xs"
            value={status}
            onChange={(e) => updateStatus(e.target.value as BenefitStatus)}
            disabled={pending}
          >
            {BENEFIT_STATUS_VALUES.map((v) => (
              <option key={v} value={v}>
                {BENEFIT_STATUS_LABELS[v]}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending}
            className="h-7 px-1.5"
            aria-label="Delete benefit"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="text-slate-500 dark:text-slate-400">Due</span>
          <input
            type="date"
            value={localDue}
            onChange={(e) => setLocalDue(e.target.value)}
            onBlur={persistDue}
            disabled={pending}
            className="mt-0.5 block w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
          {isOverdue ? (
            <span className="mt-0.5 inline-block text-[10px] text-red-600 dark:text-red-400">
              overdue
            </span>
          ) : null}
        </label>
        <label className="text-xs">
          <span className="text-slate-500 dark:text-slate-400">Note</span>
          <input
            type="text"
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            onBlur={persistNote}
            placeholder="(optional)"
            disabled={pending}
            className="mt-0.5 block w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
