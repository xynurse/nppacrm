import type { ProspectStatus } from "@/lib/db/schema";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  engaged: "Engaged",
  proposal_sent: "Proposal sent",
  negotiating: "Negotiating",
  committed: "Committed",
  confirmed: "Confirmed",
  declined: "Declined",
  past_sponsor: "Past sponsor",
};

// Clinical & precise: desaturated, hairline-bordered micro-pills.
// Low saturation reads as trustworthy/exact rather than candy-colored.
const STATUS_CLASSES: Record<ProspectStatus, string> = {
  prospect:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  contacted:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  engaged:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900",
  proposal_sent:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  negotiating:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
  committed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  confirmed:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800",
  declined:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
  past_sponsor:
    "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export const PROSPECT_STATUS_LABELS = STATUS_LABELS;
