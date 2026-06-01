"use client";

import { ExternalLink, List, Plus, Timer, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTask, deleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { InlineComplete } from "./inline-complete";

export type UserOption = { id: string; name: string; email: string };

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
  currentView,
  eventId,
  users,
}: {
  tasks: TaskRow[];
  currentUserId: string;
  currentFilter: "open" | "mine" | "overdue" | "all";
  currentView: "list" | "timeline";
  eventId: string;
  users: UserOption[];
}) {
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  const [showNewTask, setShowNewTask] = useState(false);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/tasks?filter=${f.id}&view=${currentView}`}
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

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <Link
              href={`/tasks?filter=${currentFilter}&view=list`}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors",
                currentView === "list"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </Link>
            <Link
              href={`/tasks?filter=${currentFilter}&view=timeline`}
              className={cn(
                "flex items-center gap-1 border-l border-slate-200 px-2.5 py-1.5 text-xs transition-colors dark:border-slate-700",
                currentView === "timeline"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <Timer className="h-3.5 w-3.5" />
              Timeline
            </Link>
          </div>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowNewTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTask ? (
        <NewTaskForm
          eventId={eventId}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false);
            router.refresh();
          }}
        />
      ) : null}

      {/* Task list / timeline */}
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No tasks match this filter.
          </p>
        </div>
      ) : currentView === "timeline" ? (
        <TimelineView
          tasks={tasks}
          currentUserId={currentUserId}
          deletePending={deletePending}
          onDelete={(id, title) => {
            if (!window.confirm(`Delete "${title}"?`)) return;
            startDeleteTransition(async () => {
              await deleteTask({ id });
              router.refresh();
            });
          }}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              t={t}
              currentUserId={currentUserId}
              deletePending={deletePending}
              onDelete={(id, title) => {
                if (!window.confirm(`Delete "${title}"?`)) return;
                startDeleteTransition(async () => {
                  await deleteTask({ id });
                  router.refresh();
                });
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

type Bucket = {
  label: string;
  accent: string;
  tasks: TaskRow[];
};

function bucketTasks(tasks: TaskRow[]): Bucket[] {
  const today = startOfToday();
  const endOfWeek = addDays(today, 7);

  const overdue: TaskRow[] = [];
  const todayTasks: TaskRow[] = [];
  const thisWeek: TaskRow[] = [];
  const later: TaskRow[] = [];
  const noDueDate: TaskRow[] = [];

  for (const t of tasks) {
    if (!t.dueDate) {
      noDueDate.push(t);
      continue;
    }
    const d = new Date(t.dueDate);
    d.setHours(0, 0, 0, 0);
    if (d < today && !t.completedAt) overdue.push(t);
    else if (d.getTime() === today.getTime()) todayTasks.push(t);
    else if (d < endOfWeek) thisWeek.push(t);
    else later.push(t);
  }

  return [
    {
      label: "Overdue",
      accent: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
      tasks: overdue,
    },
    {
      label: "Today",
      accent:
        "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
      tasks: todayTasks,
    },
    {
      label: "This week",
      accent:
        "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20",
      tasks: thisWeek,
    },
    {
      label: "Later",
      accent: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      tasks: later,
    },
    {
      label: "No due date",
      accent: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      tasks: noDueDate,
    },
  ].filter((b) => b.tasks.length > 0);
}

function TimelineView({
  tasks,
  currentUserId,
  deletePending,
  onDelete,
}: {
  tasks: TaskRow[];
  currentUserId: string;
  deletePending: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  const buckets = bucketTasks(tasks);

  return (
    <div className="space-y-4">
      {buckets.map((b) => (
        <section key={b.label}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                b.label === "Overdue"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : b.label === "Today"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {b.tasks.length}
            </span>
            {b.label}
          </h3>
          <ul
            className={cn(
              "divide-y rounded-lg border",
              b.label === "Overdue"
                ? "divide-red-100 border-red-200 bg-white dark:divide-red-900 dark:border-red-900 dark:bg-slate-900"
                : b.label === "Today"
                  ? "divide-amber-100 border-amber-200 bg-white dark:divide-amber-900 dark:border-amber-800 dark:bg-slate-900"
                  : "divide-slate-100 border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900",
            )}
          >
            {b.tasks.map((t) => (
              <TaskRow
                key={t.id}
                t={t}
                currentUserId={currentUserId}
                deletePending={deletePending}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ── Shared task row ───────────────────────────────────────────────────────────

function TaskRow({
  t,
  currentUserId,
  deletePending,
  onDelete,
}: {
  t: TaskRow;
  currentUserId: string;
  deletePending: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  const today = startOfToday();
  const isOverdue =
    t.dueDate && new Date(t.dueDate) < today && !t.completedAt;
  const isMine = t.assignedTo === currentUserId;

  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <InlineComplete taskId={t.id} completed={!!t.completedAt} />
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
            <span className={isOverdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
              Due {formatDate(t.dueDate)}
            </span>
          ) : null}
          {t.assigneeName ? (
            <span>{isMine ? "· Me" : `· ${t.assigneeName}`}</span>
          ) : (
            <span>· Unassigned</span>
          )}
          {t.companyName ? <span>· {t.companyName}</span> : null}
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
        disabled={deletePending}
        className="h-7 px-2 opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(t.id, t.title)}
      >
        Delete
      </Button>
    </li>
  );
}

// ── New Task Form ─────────────────────────────────────────────────────────────

function NewTaskForm({
  eventId,
  users,
  currentUserId,
  onClose,
  onCreated,
}: {
  eventId: string;
  users: UserOption[];
  currentUserId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      eventId,
      title: fd.get("title") as string,
      dueDate: (fd.get("dueDate") as string) || null,
      priority: (fd.get("priority") as string) || "medium",
      assignedTo: (fd.get("assignedTo") as string) || currentUserId,
    };

    if (!payload.title?.trim()) {
      setError("Title is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createTask(payload);
      if (res.ok) {
        onCreated();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">New task</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Input
            name="title"
            placeholder="Task title…"
            autoFocus
            className="font-medium"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Due date</Label>
            <Input type="date" name="dueDate" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <select
              name="priority"
              defaultValue="medium"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assign to</Label>
            <select
              name="assignedTo"
              defaultValue={currentUserId}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Create task"}
          </Button>
        </div>
      </form>
    </div>
  );
}
