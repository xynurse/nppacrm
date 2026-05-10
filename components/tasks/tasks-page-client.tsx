"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { InlineComplete } from "./inline-complete";

const FILTERS: { id: "open" | "mine" | "overdue" | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "mine", label: "Mine" },
  { id: "overdue", label: "Overdue" },
  { id: "all", label: "All" },
];

export function TasksPageClient({
  tasks,
  currentUserId,
  currentFilter,
}: {
  tasks: TaskRow[];
  currentUserId: string;
  currentFilter: "open" | "mine" | "overdue" | "all";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/tasks?filter=${f.id}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              currentFilter === f.id
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No tasks match this filter.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {tasks.map((t) => {
            const isOverdue =
              t.dueDate && new Date(t.dueDate) < startOfToday() && !t.completedAt;
            const isMine = t.assignedTo === currentUserId;
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <InlineComplete
                  taskId={t.id}
                  completed={!!t.completedAt}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate",
                      t.completedAt && "text-slate-400 line-through",
                    )}
                  >
                    {t.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    {t.dueDate ? (
                      <span className={isOverdue ? "text-red-600" : ""}>
                        Due {formatDate(t.dueDate)}
                      </span>
                    ) : null}
                    {t.assigneeName ? (
                      <span>
                        · {isMine ? "Me" : t.assigneeName}
                      </span>
                    ) : (
                      <span>· Unassigned</span>
                    )}
                    {t.companyName ? (
                      <span>· {t.companyName}</span>
                    ) : null}
                  </div>
                </div>
                {t.eventCompanyId ? (
                  <Link
                    href={`/companies?record=${t.eventCompanyId}`}
                    scroll={false}
                    className="hidden items-center gap-1 text-xs text-slate-500 hover:text-slate-900 group-hover:flex dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  className="h-7 px-2 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (!window.confirm(`Delete "${t.title}"?`)) return;
                    startTransition(async () => {
                      await deleteTask({ id: t.id });
                      router.refresh();
                    });
                  }}
                >
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
