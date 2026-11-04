"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runPlaybook } from "@/lib/actions/playbooks";
import { PLAYBOOKS } from "@/lib/playbooks";
import { Button } from "@/components/ui/button";

export function PlaybooksPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eventCompanyId, setEventCompanyId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const apply = (playbookId: string) => {
    const book = PLAYBOOKS.find((p) => p.id === playbookId);
    if (!book) return;
    if (!eventCompanyId.trim()) {
      setMessage("Paste a prospect ID first — or run playbooks straight from a company drawer (“Run playbook”).");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const r = await runPlaybook({
        eventCompanyId: eventCompanyId.trim(),
        playbookId: book.id,
      });
      setMessage(
        r.ok ? `Created ${r.data.taskIds.length} tasks.` : r.error,
      );
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
