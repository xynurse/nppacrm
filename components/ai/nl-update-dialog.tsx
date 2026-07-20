"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  applyNlUpdate,
  proposeNlUpdate,
  type NlApplyItemResult,
  type NlProposalMatch,
} from "@/lib/actions/nl-update";
import {
  PROSPECT_STATUS_LABELS,
  StatusBadge,
} from "@/components/companies/status-badge";
import type { ProspectStatus } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Op = NlProposalMatch["ops"][number];

type Phase =
  | { step: "input" }
  | { step: "loading" }
  | {
      step: "review";
      matches: NlProposalMatch[];
      unmatched: string[];
      costUsd: number;
    }
  | { step: "applying" }
  | { step: "done"; results: NlApplyItemResult[]; appliedCount: number }
  | { step: "error"; message: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional seed text (e.g. from the dashboard box). */
  initialText?: string;
  /** Parse immediately on open instead of showing the input step first. */
  autoRun?: boolean;
};

const key = (ci: number, oi: number) => `${ci}-${oi}`;

export function NlUpdateDialog({
  open,
  onOpenChange,
  initialText = "",
  autoRun = false,
}: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [phase, setPhase] = useState<Phase>({ step: "input" });
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  // Reset each time the dialog opens; seed text + optionally auto-run.
  useEffect(() => {
    if (!open) return;
    setText(initialText);
    setEnabled({});
    if (autoRun && initialText.trim().length > 0) {
      runPropose(initialText);
    } else {
      setPhase({ step: "input" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runPropose = (value: string) => {
    if (value.trim().length === 0) return;
    setPhase({ step: "loading" });
    startTransition(async () => {
      const res = await proposeNlUpdate({ text: value });
      if (!res.ok) {
        setPhase({ step: "error", message: res.error });
        return;
      }
      // Default every proposed op to enabled.
      const next: Record<string, boolean> = {};
      res.matches.forEach((m, ci) =>
        m.ops.forEach((_, oi) => {
          next[key(ci, oi)] = true;
        }),
      );
      setEnabled(next);
      setPhase({
        step: "review",
        matches: res.matches,
        unmatched: res.unmatched,
        costUsd: res.costUsd,
      });
    });
  };

  const runApply = (matches: NlProposalMatch[]) => {
    const items = matches
      .map((m, ci) => ({
        companyId: m.companyId,
        companyName: m.companyName,
        ops: m.ops.filter((_, oi) => enabled[key(ci, oi)]),
      }))
      .filter((it) => it.ops.length > 0);

    if (items.length === 0) return;
    setPhase({ step: "applying" });
    startTransition(async () => {
      const res = await applyNlUpdate({ items });
      if (!res.ok) {
        setPhase({ step: "error", message: res.error });
        return;
      }
      setPhase({
        step: "done",
        results: res.results,
        appliedCount: res.appliedCount,
      });
      router.refresh();
    });
  };

  const close = () => {
    onOpenChange(false);
    setPhase({ step: "input" });
  };

  if (!open) return null;

  const selectedCount =
    phase.step === "review"
      ? Object.values(enabled).filter(Boolean).length
      : 0;

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI quick update"
        className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[94vw] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-overlay)] dark:border-slate-800 dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold">AI quick update</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase.step === "input" ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Paste a plain-English recap of your outreach. Claude proposes
                structured updates — you review and confirm before anything is
                written.
              </p>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    runPropose(text);
                  }
                }}
                rows={7}
                placeholder="e.g. Met with Boston Scientific Tuesday — they want the Gold prospectus, sending it Friday. Stryker no reply to my 2nd email, follow up next week. Medtronic said no this year."
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-zinc-800 dark:text-slate-100 dark:focus:ring-brand-950"
              />
              <p className="text-xs text-slate-400">
                Won&apos;t create companies, delete anything, or set amount/tier.
                <span className="ml-1">⌘/Ctrl + Enter to parse.</span>
              </p>
            </div>
          ) : phase.step === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <p className="text-sm text-slate-500">Reading your update…</p>
            </div>
          ) : phase.step === "applying" ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <p className="text-sm text-slate-500">Applying changes…</p>
            </div>
          ) : phase.step === "error" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {phase.message}
            </div>
          ) : phase.step === "review" ? (
            <ReviewBody
              matches={phase.matches}
              unmatched={phase.unmatched}
              enabled={enabled}
              onToggle={(ci, oi) =>
                setEnabled((prev) => ({
                  ...prev,
                  [key(ci, oi)]: !prev[key(ci, oi)],
                }))
              }
            />
          ) : phase.step === "done" ? (
            <DoneBody results={phase.results} appliedCount={phase.appliedCount} />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          {phase.step === "review" ? (
            <>
              <span className="text-xs text-slate-400">
                {phase.matches.length} compan
                {phase.matches.length === 1 ? "y" : "ies"} ·{" "}
                {selectedCount} change{selectedCount === 1 ? "" : "s"} selected ·
                est. ${phase.costUsd.toFixed(3)}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => runApply(phase.matches)}
                  disabled={selectedCount === 0 || pending}
                >
                  Apply {selectedCount > 0 ? selectedCount : ""}
                </Button>
              </div>
            </>
          ) : phase.step === "done" ? (
            <div className="flex w-full justify-end">
              <Button size="sm" onClick={close}>
                Done
              </Button>
            </div>
          ) : phase.step === "input" ? (
            <div className="flex w-full justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => runPropose(text)}
                disabled={text.trim().length === 0 || pending}
              >
                Parse with AI
              </Button>
            </div>
          ) : phase.step === "error" ? (
            <div className="flex w-full justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={close}>
                Close
              </Button>
              <Button size="sm" onClick={() => setPhase({ step: "input" })}>
                Back
              </Button>
            </div>
          ) : (
            <div className="h-8" />
          )}
        </div>
      </div>
    </>
  );
}

function ReviewBody({
  matches,
  unmatched,
  enabled,
  onToggle,
}: {
  matches: NlProposalMatch[];
  unmatched: string[];
  enabled: Record<string, boolean>;
  onToggle: (ci: number, oi: number) => void;
}) {
  if (matches.length === 0 && unmatched.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Nothing actionable found in that text.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {matches.map((m, ci) => (
        <div
          key={m.companyId}
          className="rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-sm font-medium">{m.companyName}</span>
            <StatusBadge status={m.currentStatus as ProspectStatus} />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {m.ops.map((op, oi) => {
              const on = enabled[key(ci, oi)] ?? false;
              const confirmWarn =
                op.kind === "set_status" && op.status === "confirmed";
              return (
                <li key={oi} className="flex items-start gap-2.5 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(ci, oi)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm",
                        on
                          ? "text-slate-800 dark:text-slate-100"
                          : "text-slate-400 line-through",
                      )}
                    >
                      {describeOp(op, m.currentStatus)}
                    </div>
                    {confirmWarn ? (
                      <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                        Confirms need amount + tier — this opens the pipeline
                        confirm modal instead of writing directly.
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {unmatched.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Couldn&apos;t match:</span>{" "}
            {unmatched.join(", ")}. Add them via quick-add or CSV import, then
            re-run.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function describeOp(op: Op, currentStatus: string): React.ReactNode {
  switch (op.kind) {
    case "set_status":
      return (
        <span className="inline-flex items-center gap-1.5">
          Status
          <span className="text-slate-400">
            {PROSPECT_STATUS_LABELS[currentStatus as ProspectStatus] ??
              currentStatus}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="font-medium">
            {op.status
              ? (PROSPECT_STATUS_LABELS[op.status] ?? op.status)
              : "?"}
          </span>
        </span>
      );
    case "log_interaction":
      return (
        <>
          Log <span className="font-medium">{op.interactionType ?? "note"}</span>
          {op.subject ? <> — {op.subject}</> : null}
          {op.occurredAt ? (
            <span className="text-slate-400"> ({op.occurredAt})</span>
          ) : null}
        </>
      );
    case "bump_last_contacted":
      return (
        <>
          Set last contact →{" "}
          <span className="font-medium">{op.occurredAt ?? "?"}</span>
        </>
      );
    case "set_next_action_at":
      return (
        <>
          Next action → <span className="font-medium">{op.date ?? "?"}</span>
        </>
      );
    case "create_task":
      return (
        <>
          Task: <span className="font-medium">{op.title}</span>
          {op.dueDate ? (
            <span className="text-slate-400"> (due {op.dueDate})</span>
          ) : null}
          {op.priority ? (
            <span className="text-slate-400"> · {op.priority}</span>
          ) : null}
        </>
      );
    default:
      return null;
  }
}

function DoneBody({
  results,
  appliedCount,
}: {
  results: NlApplyItemResult[];
  appliedCount: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Check className="h-4 w-4 shrink-0" />
        Applied {appliedCount} change{appliedCount === 1 ? "" : "s"} across{" "}
        {results.length} compan{results.length === 1 ? "y" : "ies"}.
      </div>
      <ul className="space-y-2">
        {results.map((r) => (
          <li
            key={r.companyId}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
          >
            <div className="font-medium">{r.companyName}</div>
            {r.applied.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                {r.applied.map((a, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}
            {r.skipped.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-xs text-amber-600 dark:text-amber-500">
                {r.skipped.map((s, i) => (
                  <li key={i}>
                    skipped {s.kind}: {s.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
