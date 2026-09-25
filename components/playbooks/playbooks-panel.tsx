"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";

type Step = { title: string; dueOffsetDays: number; priority: "high" | "medium" | "low" };

const PLAYBOOKS: {
  id: string;
  name: string;
  description: string;
  steps: Step[];
}[] = [
  {
    id: "first-outreach",
    name: "First outreach",
    description: "Initial email + 7-day bump + 14-day call.",
    steps: [
      { title: "Send intro sponsorship email", dueOffsetDays: 0, priority: "high" },
      { title: "Follow up if no reply", dueOffsetDays: 7, priority: "medium" },
      { title: "Call / LinkedIn nudge", dueOffsetDays: 14, priority: "medium" },
    ],
  },
  {
    id: "bounce-recovery",
    name: "Bounce recovery",
    description: "Find a valid address and re-send.",
    steps: [
      {
        title: "Find valid email / alternate contact",
        dueOffsetDays: 1,
        priority: "high",
      },
      {
        title: "Re-send outreach to new address",
        dueOffsetDays: 3,
        priority: "high",
      },
      { title: "Clear BOUNCED tag if delivered", dueOffsetDays: 5, priority: "low" },
    ],
  },
  {
    id: "proposal-close",
    name: "Proposal close",
    description: "After sending a proposal — keep momentum.",
    steps: [
      { title: "Confirm proposal received", dueOffsetDays: 2, priority: "high" },
      { title: "Answer questions / negotiate", dueOffsetDays: 7, priority: "high" },
      { title: "Ask for verbal commit", dueOffsetDays: 14, priority: "medium" },
    ],
  },
];

function addDays(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function PlaybooksPanel({
  eventId,
}: {
  eventId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eventCompanyId, setEventCompanyId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const apply = (playbookId: string) => {
    const book = PLAYBOOKS.find((p) => p.id === playbookId);
    if (!book) return;
    if (!eventCompanyId.trim()) {
      setMessage("Paste a prospect ID (event company UUID) first — open a company drawer and copy the record= id from the URL.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      let ok = 0;
      for (const step of book.steps) {
        const r = await createTask({
          eventId,
          eventCompanyId: eventCompanyId.trim(),
          title: `[${book.name}] ${step.title}`,
          dueDate: addDays(step.dueOffsetDays),
          priority: step.priority,
        });
        if (r.ok) ok += 1;
      }
      setMessage(`Created ${ok}/${book.steps.length} tasks.`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="surface-card space-y-2 p-4">
        <label className="block text-xs font-medium text-zinc-500">
          Prospect ID (from URL <code className="text-[10px]">?record=…</code>)
        </label>
        <input
          value={eventCompanyId}
          onChange={(e) => setEventCompanyId(e.target.value)}
          placeholder="uuid…"
          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        {message ? (
          <p className="text-xs text-zinc-500">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PLAYBOOKS.map((p) => (
          <div key={p.id} className="surface-card flex flex-col p-4">
            <h2 className="font-display text-sm font-semibold">{p.name}</h2>
            <p className="mt-1 flex-1 text-xs text-zinc-500">{p.description}</p>
            <ul className="mt-3 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              {p.steps.map((s) => (
                <li key={s.title}>
                  · {s.title}{" "}
                  <span className="text-zinc-400">(+{s.dueOffsetDays}d)</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-4"
              size="sm"
              disabled={pending}
              onClick={() => apply(p.id)}
            >
              Apply playbook
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
