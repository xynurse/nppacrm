"use client";

import type { ProspectPriority } from "@/lib/db/schema";
import { cn } from "@/lib/cn";

export const PRIORITY_ORDER: ProspectPriority[] = ["high", "medium", "low"];

export const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const FLAG_CLASS: Record<ProspectPriority, string> = {
  high: "text-[var(--priority-high)]",
  medium: "text-[var(--priority-medium)]",
  low: "text-[var(--priority-low)]",
};

const CHIP_CLASS: Record<ProspectPriority, string> = {
  high: "bg-[var(--priority-high-tint)] text-[var(--priority-high)] ring-[var(--priority-high)]/20",
  medium:
    "bg-[var(--priority-medium-tint)] text-[var(--priority-medium)] ring-[var(--priority-medium)]/20",
  low: "bg-[var(--priority-low-tint)] text-[var(--priority-low)] ring-[var(--priority-low)]/25",
};

/** Compact Todoist-style flag; optional click cycles priority. */
export function PriorityFlag({
  priority,
  onCycle,
  size = "md",
  showLabel = false,
}: {
  priority: ProspectPriority;
  onCycle?: () => void;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const icon = (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn(
        FLAG_CLASS[priority],
        size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
      )}
    >
      <path
        fill="currentColor"
        d="M3.25 1.5a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 1.5 0V9.5h7.1a.75.75 0 0 0 .56-1.25L9.6 5.75l1.81-2.5A.75.75 0 0 0 10.8 2H4a.75.75 0 0 0-.75-.5Z"
      />
    </svg>
  );

  if (onCycle) {
    return (
      <button
        type="button"
        title={`Priority: ${PRIORITY_LABELS[priority]} (click to change)`}
        aria-label={`Priority ${PRIORITY_LABELS[priority]}. Click to cycle.`}
        onClick={(e) => {
          e.stopPropagation();
          onCycle();
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--surface-muted)]",
          FLAG_CLASS[priority],
        )}
      >
        {icon}
        {showLabel ? (
          <span className="text-[11px] font-medium">
            {PRIORITY_LABELS[priority]}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <span
      title={PRIORITY_LABELS[priority]}
      className={cn("inline-flex items-center gap-1", FLAG_CLASS[priority])}
    >
      {icon}
      {showLabel ? (
        <span className="text-[11px] font-medium text-[var(--ink-muted)]">
          {PRIORITY_LABELS[priority]}
        </span>
      ) : null}
    </span>
  );
}

export function PriorityChip({ priority }: { priority: ProspectPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        CHIP_CLASS[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function nextPriority(current: ProspectPriority): ProspectPriority {
  const i = PRIORITY_ORDER.indexOf(current);
  return PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length] ?? "medium";
}
