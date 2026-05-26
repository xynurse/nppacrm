import type { ProspectStatus } from "@/lib/db/schema";

/**
 * Active prospect statuses — these are the ones where "no contact in X days"
 * actually indicates a problem. Confirmed / declined / past_sponsor rows
 * don't need cadence tinting; they're either won or shelved.
 */
const ACTIVE_CADENCE_STATUSES: ReadonlySet<ProspectStatus> = new Set([
  "prospect",
  "contacted",
  "engaged",
  "proposal_sent",
  "negotiating",
  "committed",
]);

export const CADENCE_AMBER_DAYS = 14;
export const CADENCE_RED_DAYS = 30;

export type CadenceLevel = "ok" | "amber" | "red";

export function cadenceLevel(opts: {
  status: ProspectStatus | string;
  lastContactedAt: Date | string | null;
  now?: Date;
}): CadenceLevel {
  if (!ACTIVE_CADENCE_STATUSES.has(opts.status as ProspectStatus)) {
    return "ok";
  }
  if (!opts.lastContactedAt) {
    // Never contacted yet — count from the start of time as effectively red.
    return "red";
  }
  const last =
    opts.lastContactedAt instanceof Date
      ? opts.lastContactedAt
      : new Date(opts.lastContactedAt);
  if (Number.isNaN(last.getTime())) return "ok";
  const days = Math.floor(
    ((opts.now ?? new Date()).getTime() - last.getTime()) / 86_400_000,
  );
  if (days >= CADENCE_RED_DAYS) return "red";
  if (days >= CADENCE_AMBER_DAYS) return "amber";
  return "ok";
}

export function cadenceTextClass(level: CadenceLevel): string {
  if (level === "red") return "text-red-700 dark:text-red-400 font-medium";
  if (level === "amber") return "text-amber-700 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}
