import { Clock, MailX } from "lucide-react";
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

/** Soft tinted pills — sentence case, no uppercase shout. */
const STATUS_CLASSES: Record<ProspectStatus, string> = {
  prospect:
    "bg-zinc-100 text-zinc-600 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  contacted:
    "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
  engaged:
    "bg-cyan-50 text-cyan-700 ring-cyan-200/80 dark:bg-cyan-950/50 dark:text-cyan-300 dark:ring-cyan-900",
  proposal_sent:
    "bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  negotiating:
    "bg-orange-50 text-orange-700 ring-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900",
  committed:
    "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
  confirmed:
    "bg-emerald-100 text-emerald-800 ring-emerald-300/80 dark:bg-emerald-900/60 dark:text-emerald-200 dark:ring-emerald-800",
  declined:
    "bg-red-50 text-red-700 ring-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
  past_sponsor:
    "bg-zinc-100 text-zinc-500 ring-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
};

const badgeBase =
  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight ring-1 ring-inset";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <span className={cn(badgeBase, STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export const PROSPECT_STATUS_LABELS = STATUS_LABELS;

/** Tag applied when outreach to a company's email bounced / was undeliverable. */
export const BOUNCED_TAG = "BOUNCED";

export function hasBouncedTag(tags: string[] | null | undefined): boolean {
  return Array.isArray(tags) && tags.includes(BOUNCED_TAG);
}

/** Red flag — email on file bounced. */
export function BouncedBadge() {
  return (
    <span
      title="Last outreach email bounced — the address on file needs replacing"
      className={cn(
        badgeBase,
        "bg-red-50 text-red-700 ring-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900",
      )}
    >
      <MailX className="h-3 w-3" />
      Bounced
    </span>
  );
}

/** Tag applied when a company was intentionally held back from a batch —
 * still a live future prospect, just not being worked right now. */
export const DEFERRED_TAG = "DEFERRED";

export function hasDeferredTag(tags: string[] | null | undefined): boolean {
  return Array.isArray(tags) && tags.includes(DEFERRED_TAG);
}

/** Violet flag — outreach deferred, future prospect. */
export function DeferredBadge() {
  return (
    <span
      title="Deferred — no outreach this batch; kept as a future sponsorship prospect"
      className={cn(
        badgeBase,
        "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
      )}
    >
      <Clock className="h-3 w-3" />
      Deferred
    </span>
  );
}
