"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTaskCompleted, updateTask } from "@/lib/actions/tasks";
import type { MyTaskRow } from "@/lib/db/queries/dashboard";
import { InlineComplete } from "@/components/tasks/inline-complete";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "spcrm:dashboard-today-collapsed";

type Props = {
  tasks: MyTaskRow[];
};

export function TodayTasksSection({ tasks: initialTasks }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkDue, setBulkDue] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
    setSelected(new Set());
  }, [initialTasks]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  const visible = useMemo(() => tasks.slice(0, 12), [tasks]);
  const allVisibleSelected =
    visible.length > 0 && visible.every((t) => selected.has(t.id));
  const selectedCount = selected.size;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visible.map((t) => t.id)));
  }

  function removeLocal(ids: string[]) {
    const drop = new Set(ids);
    setTasks((prev) => prev.filter((t) => !drop.has(t.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  function patchLocalDue(ids: string[], dueDate: string | null) {
    const set = new Set(ids);
    setTasks((prev) =>
      prev.map((t) => (set.has(t.id) ? { ...t, dueDate } : t)),
    );
  }

  function completeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    removeLocal(ids);
    startTransition(async () => {
      await Promise.all(
        ids.map((id) => setTaskCompleted({ id, completed: true })),
      );
      router.refresh();
    });
  }

  function applyBulkDue() {
    const ids = [...selected];
    if (ids.length === 0 || !bulkDue) return;
    patchLocalDue(ids, bulkDue);
    startTransition(async () => {
      await Promise.all(ids.map((id) => updateTask({ id, dueDate: bulkDue })));
      setSelected(new Set());
      router.refresh();
    });
  }

  function onDueChange(id: string, dueDate: string) {
    const next = dueDate || null;
    patchLocalDue([id], next);
    startTransition(async () => {
      await updateTask({ id, dueDate: next });
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => persistCollapsed(!collapsed)}
          className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
          aria-expanded={hydrated ? !collapsed : true}
          aria-controls="dashboard-today-panel"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          )}
          Today
          {tasks.length > 0 ? (
            <span className="font-sans text-xs font-normal text-zinc-400">
              ({tasks.length})
            </span>
          ) : null}
        </button>
        <Link
          href="/tasks"
          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          All tasks
        </Link>
      </div>

      {!collapsed ? (
        <div id="dashboard-today-panel" className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No open tasks assigned to you. You’re clear.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500/30"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all visible tasks"
                  />
                  Select all
                </label>
                {selectedCount > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {selectedCount} selected
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={completeSelected}
                    >
                      Complete
                    </Button>
                    <input
                      type="date"
                      value={bulkDue}
                      onChange={(e) => setBulkDue(e.target.value)}
                      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs tabular-nums text-zinc-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                      aria-label="Bulk due date"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || !bulkDue}
                      onClick={applyBulkDue}
                    >
                      Set date
                    </Button>
                  </div>
                ) : null}
              </div>

              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {visible.map((t) => {
                  const isSelected = selected.has(t.id);
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 py-2.5 text-sm first:pt-0",
                        isSelected && "bg-brand-50/40 dark:bg-brand-950/20",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 text-brand-600 focus:ring-brand-500/30"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.id)}
                        aria-label={`Select ${t.title}`}
                      />
                      <InlineComplete
                        taskId={t.id}
                        completed={false}
                        onLocalChange={(next) => {
                          if (next) removeLocal([t.id]);
                        }}
                      />
                      {t.eventCompanyId ? (
                        <Link
                          href={`/companies?record=${t.eventCompanyId}`}
                          scroll={false}
                          className="min-w-0 flex-1 truncate text-zinc-800 hover:underline dark:text-zinc-100"
                        >
                          {t.title}
                          {t.companyName ? (
                            <span className="text-zinc-400">
                              {" "}
                              · {t.companyName}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-100">
                          {t.title}
                          {t.companyName ? (
                            <span className="text-zinc-400">
                              {" "}
                              · {t.companyName}
                            </span>
                          ) : null}
                        </span>
                      )}
                      <input
                        type="date"
                        value={t.dueDate ?? ""}
                        onChange={(e) => onDueChange(t.id, e.target.value)}
                        disabled={pending}
                        className="h-7 w-[8.5rem] shrink-0 rounded border border-transparent bg-transparent px-1 text-xs tabular-nums text-zinc-500 outline-none hover:border-zinc-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 dark:text-zinc-400 dark:hover:border-zinc-700"
                        aria-label={`Due date for ${t.title}`}
                      />
                    </li>
                  );
                })}
              </ul>

              {tasks.length > visible.length ? (
                <Link
                  href="/tasks"
                  className="inline-block text-xs text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  +{tasks.length - visible.length} more →
                </Link>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
