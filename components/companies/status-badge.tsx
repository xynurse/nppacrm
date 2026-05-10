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

const STATUS_CLASSES: Record<ProspectStatus, string> = {
  prospect: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  contacted: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  engaged:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  proposal_sent:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  negotiating:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  committed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  confirmed:
    "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-50",
  declined: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  past_sponsor:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
};

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export const PROSPECT_STATUS_LABELS = STATUS_LABELS;
