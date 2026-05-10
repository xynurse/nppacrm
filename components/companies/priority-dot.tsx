import type { ProspectPriority } from "@/lib/db/schema";
import { cn } from "@/lib/cn";

const PRIORITY_CLASSES: Record<ProspectPriority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function PriorityDot({ priority }: { priority: ProspectPriority }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs"
      title={PRIORITY_LABELS[priority]}
    >
      <span
        className={cn("h-2 w-2 rounded-full", PRIORITY_CLASSES[priority])}
      />
      <span className="text-slate-700 dark:text-slate-300">
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  );
}
