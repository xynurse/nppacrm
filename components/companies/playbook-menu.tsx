"use client";

import { ListChecks } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runPlaybook, undoPlaybook } from "@/lib/actions/playbooks";
import { PLAYBOOKS } from "@/lib/playbooks";

type LastRun = { name: string; taskIds: string[] };

export function PlaybookMenu({
  eventCompanyId,
  onChanged,
}: {
  eventCompanyId: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpen(false);
    setMessage(null);
    setLastRun(null);
  }, [eventCompanyId]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const run = (playbookId: string) => {
    setOpen(false);
    setMessage(null);
    startTransition(async () => {
      const res = await runPlaybook({ eventCompanyId, playbookId });
      if (!res.ok) {
        setMessage(res.error);
        setLastRun(null);
        return;
      }
      setLastRun({ name: res.data.playbookName, taskIds: res.data.taskIds });
      setMessage(`Added ${res.data.taskIds.length} tasks from “${res.data.playbookName}”.`);
      onChanged();
    });
  };

  const undo = () => {
    if (!lastRun) return;
    const run = lastRun;
    startTransition(async () => {
      const res = await undoPlaybook({ eventCompanyId, taskIds: run.taskIds });
      setLastRun(null);
      setMessage(res.ok ? `Removed ${res.data.count} tasks.` : res.error);
      onChanged();
    });
  };

  return (
    <div ref={ref} className="relative flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ListChecks className="mr-1.5 h-3.5 w-3.5" />
        {pending ? "Working…" : "Run playbook"}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {PLAYBOOKS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              onClick={() => run(p.id)}
              className="block w-full rounded px-3 py-2 text-left hover:bg-zinc-100"
            >
              <span className="block text-sm font-medium text-zinc-900">{p.name}</span>
              <span className="block text-xs text-zinc-500">
                {p.steps.length} tasks · {p.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="flex items-center gap-2 text-[11px] text-zinc-500" role="status">
          {message}
          {lastRun ? (
            <button
              type="button"
              onClick={undo}
              disabled={pending}
              className="font-medium text-indigo-600 hover:underline"
            >
              Undo
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
