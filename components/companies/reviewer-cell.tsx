"use client";

import { Check, Minus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setReviewVote } from "@/lib/actions/reviews";
import { cn } from "@/lib/cn";
import type { ReviewVote } from "@/lib/db/schema";

export function ReviewerCell({
  eventCompanyId,
  myVote,
  yesCount,
  noCount,
  reviewerCount,
  canVote,
}: {
  eventCompanyId: string;
  myVote: ReviewVote | null;
  yesCount: number;
  noCount: number;
  reviewerCount: number;
  canVote: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<ReviewVote | null>(myVote);
  const [pending, startTransition] = useTransition();

  const teamApproved = reviewerCount > 0 && yesCount === reviewerCount;
  const teamRejected = noCount > 0;

  const cycle = () => {
    if (!canVote || pending) return;
    const next: ReviewVote | null =
      optimistic === null ? "yes" : optimistic === "yes" ? "no" : null;
    setOptimistic(next);
    startTransition(async () => {
      const result = await setReviewVote({
        eventCompanyId,
        vote: next,
      });
      if (!result.ok) setOptimistic(myVote);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={!canVote || pending}
        title={
          !canVote
            ? `Reviewer status — ${yesCount} yes, ${noCount} no of ${reviewerCount}`
            : "Click to vote: — → yes → no → —"
        }
        onClick={cycle}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          optimistic === "yes" &&
            "border-emerald-500 bg-emerald-500 text-white",
          optimistic === "no" && "border-red-500 bg-red-500 text-white",
          optimistic === null &&
            "border-slate-300 text-slate-400 dark:border-slate-700",
          canVote && !pending && "hover:border-slate-500",
          !canVote && "cursor-default opacity-60",
        )}
      >
        {optimistic === "yes" ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : optimistic === "no" ? (
          <X className="h-3 w-3" strokeWidth={3} />
        ) : (
          <Minus className="h-2.5 w-2.5" />
        )}
      </button>
      {teamApproved ? (
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          Approved
        </span>
      ) : teamRejected ? (
        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-700 dark:bg-red-900 dark:text-red-300">
          {noCount} no
        </span>
      ) : reviewerCount > 0 ? (
        <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
          {yesCount}/{reviewerCount}
        </span>
      ) : null}
    </div>
  );
}
