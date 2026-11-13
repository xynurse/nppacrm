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

/** Soft tinted pills — sentence case, no ring (quieter in dense tables). */
const STATUS_CLASSES: Record<ProspectStatus, string> = {
  prospect:
    "bg-zinc-100/80 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300",
  contacted:
    "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  engaged:
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  proposal_sent:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  negotiating:
    "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  committed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  confirmed:
    "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  declined:
    "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  past_sponsor:
    "bg-zinc-100/80 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400",
};

const badgeBase =
  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight";

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
        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
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

/** Stone flag — outreach deferred, future prospect (not a brand purple). */
export function DeferredBadge() {
  return (
    <span
      title="Deferred — no outreach this batch; kept as a future sponsorship prospect"
      className={cn(
        badgeBase,
        "bg-stone-100 text-stone-700 dark:bg-stone-900/50 dark:text-stone-300",
      )}
    >
      <Clock className="h-3 w-3" />
      Deferred
    </span>
  );
}
