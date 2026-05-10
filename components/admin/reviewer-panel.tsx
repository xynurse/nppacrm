"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { addReviewer, removeReviewer } from "@/lib/actions/events";

type Reviewer = {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
};

type Candidate = {
  id: string;
  name: string;
  email: string;
};

export function ReviewerPanel({
  eventId,
  reviewers,
  candidates,
}: {
  eventId: string;
  reviewers: Reviewer[];
  candidates: Candidate[];
}) {
  const [pending, startTransition] = useTransition();
  const reviewerIds = useMemo(
    () => new Set(reviewers.map((r) => r.userId)),
    [reviewers],
  );
  const available = candidates.filter((c) => !reviewerIds.has(c.id));
  const [selected, setSelected] = useState<string>(available[0]?.id ?? "");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold">Reviewers</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Reviewers vote Yes/No on each prospect for this event. Voting UI lands
        in chunk 5.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Select
          className="h-8 w-72 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending || available.length === 0}
        >
          {available.length === 0 ? (
            <option value="">No more users to add</option>
          ) : (
            available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email}
              </option>
            ))
          )}
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !selected}
          onClick={() => {
            startTransition(async () => {
              await addReviewer({ eventId, userId: selected });
            });
          }}
        >
          Add reviewer
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
        {reviewers.length === 0 ? (
          <li className="py-3 text-slate-500 dark:text-slate-400">
            No reviewers assigned.
          </li>
        ) : (
          reviewers.map((r) => (
            <li
              key={r.userId}
              className="flex items-center justify-between py-2"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await removeReviewer({ eventId, userId: r.userId });
                  });
                }}
              >
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
