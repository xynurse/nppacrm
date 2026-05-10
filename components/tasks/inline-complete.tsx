"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTaskCompleted } from "@/lib/actions/tasks";
import { cn } from "@/lib/cn";

export function InlineComplete({
  taskId,
  completed,
  onLocalChange,
}: {
  taskId: string;
  completed: boolean;
  onLocalChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(completed);
  const [pulse, setPulse] = useState(false);
  const [, startTransition] = useTransition();

  const isChecked = optimistic;

  return (
    <button
      type="button"
      aria-label={isChecked ? "Mark task incomplete" : "Mark task complete"}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
        isChecked
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-slate-300 hover:border-emerald-400 dark:border-slate-600",
        pulse && "scale-125",
      )}
      onClick={(e) => {
        e.stopPropagation();
        const next = !isChecked;
        setOptimistic(next);
        onLocalChange?.(next);
        if (next) {
          setPulse(true);
          setTimeout(() => setPulse(false), 220);
        }
        startTransition(async () => {
          const result = await setTaskCompleted({ id: taskId, completed: next });
          if (!result.ok) {
            setOptimistic(!next);
            onLocalChange?.(!next);
          }
          router.refresh();
        });
      }}
    >
      {isChecked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  );
}
