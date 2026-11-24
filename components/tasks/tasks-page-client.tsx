"use client";

import {
  Columns3,
  ExternalLink,
  List,
  Plus,
  Search,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createTask, deleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AssigneePicker } from "./assignee-picker";
import { bucketTasks, startOfToday } from "./date-buckets";
import { InlineComplete } from "./inline-complete";
import { TasksKanban } from "./tasks-kanban";
import type { TaskFilter, TaskView, UserOption } from "./types";

export type { UserOption } from "./types";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "mine", label: "Mine" },
  { id: "overdue", label: "Overdue" },
  { id: "all", label: "All" },
];

const VIEWS: { id: TaskView; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: Timer },
  { id: "kanban", label: "Board", icon: Columns3 },
];

const PRIORITIES = ["high", "medium", "low"] as const;

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
  currentFilter: TaskFilter;
  currentView: TaskView;
  eventId: string;
  users: UserOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deletePending, startDeleteTransition] = useTransition();
  const [showNewTask, setShowNewTask] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const priorityParam = searchParams.get("priority") ?? "";
  const assigneeParam = searchParams.get("assignee") ?? "";

  const hrefFor = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  const setParam = (key: string, value: string | null) => {
    router.replace(hrefFor({ [key]: value }), { scroll: false });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (priorityParam && t.priority !== priorityParam) return false;
      if (assigneeParam === "unassigned" && t.assignedTo) return false;
      if (
        assigneeParam &&
        assigneeParam !== "unassigned" &&
        t.assignedTo !== assigneeParam
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [t.title, t.companyName, t.assigneeName, t.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((term) => hay.includes(term));
    });
  }, [tasks, query, priorityParam, assigneeParam]);

  const onDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    startDeleteTransition(async () => {
      await deleteTask({ id });
      router.refresh();
    });
  };

  const hasSecondaryFilters = Boolean(query || priorityParam || assigneeParam);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--surface-muted)]/60 p-0.5">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={hrefFor({ filter: f.id })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  currentFilter === f.id
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-card)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--surface)]">
              {VIEWS.map((v, i) => {
                const Icon = v.icon;
                return (
                  <Link
                    key={v.id}
                    href={hrefFor({ view: v.id })}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                      i > 0 && "border-l border-[var(--hairline)]",
                      currentView === v.id
                        ? "bg-[var(--ink)] text-white"
                        : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </Link>
                );
              })}
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-subtle)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title, company, assignee…"
              className="h-8 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] pl-8 pr-7 text-sm shadow-[var(--shadow-card)] placeholder:text-[var(--ink-subtle)] hover:border-[var(--hairline-strong)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--ink-subtle)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <select
            value={priorityParam}
            onChange={(e) => setParam("priority", e.target.value || null)}
            className="h-8 rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-xs text-[var(--ink)] shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={assigneeParam}
            onChange={(e) => setParam("assignee", e.target.value || null)}
            className="h-8 max-w-[10rem] rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-xs text-[var(--ink)] shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
            aria-label="Filter by assignee"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === currentUserId ? `${u.name} (me)` : u.name}
              </option>
            ))}
          </select>

          {hasSecondaryFilters ? (
            <span className="text-[11px] tabular-nums text-[var(--ink-subtle)]">
              {visible.length} of {tasks.length}
            </span>
          ) : null}
        </div>
      </div>

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

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--ink-muted)]">
            No tasks match this filter.
          </p>
          {hasSecondaryFilters ? (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
              onClick={() => {
                setQuery("");
                router.replace(
                  hrefFor({ priority: null, assignee: null, q: null }),
                  { scroll: false },
                );
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : currentView === "kanban" ? (
        <TasksKanban
          tasks={visible}
          users={users}
          currentUserId={currentUserId}
          includeDone={currentFilter === "all"}
        />
      ) : currentView === "timeline" ? (
        <TimelineView
          tasks={visible}
          users={users}
          currentUserId={currentUserId}
          deletePending={deletePending}
          onDelete={onDelete}
          includeDone={currentFilter === "all"}
        />
      ) : (
        <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
          {visible.map((t) => (
            <TaskListRow
              key={t.id}
              t={t}
              users={users}
              currentUserId={currentUserId}
              deletePending={deletePending}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function TimelineView({
  tasks,
  users,
  currentUserId,
  deletePending,
  onDelete,
  includeDone,
}: {
  tasks: TaskRow[];
  users: UserOption[];
  currentUserId: string;
  deletePending: boolean;
  onDelete: (id: string, title: string) => void;
  includeDone: boolean;
}) {
  const buckets = bucketTasks(tasks, { includeDone }).filter(
    (b) => b.tasks.length > 0,
  );

  return (
    <div className="space-y-5">
      {buckets.map((b) => (
        <section key={b.id} className="relative pl-4">
          <div
            className={cn(
              "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[var(--page)]",
              b.id === "overdue"
                ? "bg-red-500"
                : b.id === "today"
                  ? "bg-amber-500"
                  : b.id === "done"
                    ? "bg-emerald-500"
                    : "bg-sky-500",
            )}
          />
          <div className="absolute bottom-0 left-[3px] top-5 w-px bg-[var(--hairline)]" />
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            {b.label}
            <span className="rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums normal-case text-[var(--ink-subtle)]">
              {b.tasks.length}
            </span>
          </h3>
          <ul className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-card)] divide-y divide-[var(--hairline)]">
            {b.tasks.map((t) => (
              <TaskListRow
                key={t.id}
                t={t}
                users={users}
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

function TaskListRow({
  t,
  users,
  currentUserId,
  deletePending,
  onDelete,
}: {
  t: TaskRow;
  users: UserOption[];
  currentUserId: string;
  deletePending: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  const today = startOfToday();
  const isOverdue =
    !!t.dueDate && new Date(t.dueDate) < today && !t.completedAt;

  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-muted)]/60">
      <InlineComplete taskId={t.id} completed={!!t.completedAt} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[var(--ink)]",
            t.completedAt && "text-[var(--ink-subtle)] line-through",
          )}
        >
          {t.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--ink-muted)]">
          {t.dueDate ? (
            <span
              className={cn(
                isOverdue && "font-medium text-red-600",
              )}
            >
              Due {formatDate(t.dueDate)}
            </span>
          ) : (
            <span className="text-[var(--ink-subtle)]">No due date</span>
          )}
          {t.companyName ? <span>· {t.companyName}</span> : null}
          {t.priority !== "medium" ? (
            <span className="capitalize">· {t.priority}</span>
          ) : null}
        </div>
      </div>
      <AssigneePicker
        taskId={t.id}
        assignedTo={t.assignedTo}
        assigneeName={t.assigneeName}
        users={users}
        currentUserId={currentUserId}
        className="shrink-0"
      />
      {t.eventCompanyId ? (
        <Link
          href={`/companies?record=${t.eventCompanyId}`}
          scroll={false}
          className="hidden items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] group-hover:flex"
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
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[var(--shadow-raised)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ink)]">New task</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--ink-subtle)] hover:text-[var(--ink)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          name="title"
          placeholder="Task title…"
          autoFocus
          className="font-medium"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Due date</Label>
            <Input type="date" name="dueDate" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <select
              name="priority"
              defaultValue="medium"
              className="h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
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
              className="h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
