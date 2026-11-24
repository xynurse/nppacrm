"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineComplete } from "@/components/tasks/inline-complete";
import type { TaskRow } from "@/lib/db/queries/tasks";
import type { ProspectPriority } from "@/lib/db/schema";
import { addCalendarDays } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  PriorityFlag,
  nextPriority,
} from "./priority-flag";

export type CalendarUserOption = {
  id: string;
  name: string;
  email: string;
};

type ViewMode = "month" | "list";
type DateFilter =
  | "overdue"
  | "today"
  | "upcoming"
  | "month"
  | "no-date"
  | "all";
type PriorityFilter = "all" | ProspectPriority;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Next 7 days" },
  { id: "month", label: "This month" },
  { id: "no-date", label: "No date" },
  { id: "all", label: "All" },
];

function priorityRank(p: ProspectPriority): number {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

function sortTasks(a: TaskRow, b: TaskRow): number {
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;
  const da = a.dueDate ?? "9999-99-99";
  const db = b.dueDate ?? "9999-99-99";
  if (da !== db) return da.localeCompare(db);
  return a.title.localeCompare(b.title);
}

function ymdFromDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function CalendarWorkspace({
  tasks,
  today,
  eventId,
  eventName,
  currentUserId,
  users,
}: {
  tasks: TaskRow[];
  /** YYYY-MM-DD in the event timezone */
  today: string;
  eventId: string;
  eventName: string;
  currentUserId: string;
  users: CalendarUserOption[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => parseISO(`${today}T12:00:00`));
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [, startPriority] = useTransition();

  const monthLabel = format(cursor, "MMMM yyyy");
  const monthPrefix = format(cursor, "yyyy-MM");

  const filteredByPriority = useMemo(() => {
    if (priorityFilter === "all") return tasks;
    return tasks.filter((t) => t.priority === priorityFilter);
  }, [tasks, priorityFilter]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of filteredByPriority) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const [, list] of map) list.sort(sortTasks);
    return map;
  }, [filteredByPriority]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedTasks = useMemo(() => {
    if (!selectedDay) return [];
    return (tasksByDate.get(selectedDay) ?? []).slice().sort(sortTasks);
  }, [selectedDay, tasksByDate]);

  const undated = useMemo(
    () => filteredByPriority.filter((t) => !t.dueDate).sort(sortTasks),
    [filteredByPriority],
  );

  const listTasks = useMemo(() => {
    const upcomingEnd = addCalendarDays(today, 7);
    return filteredByPriority
      .filter((t) => {
        switch (dateFilter) {
          case "overdue":
            return !!t.dueDate && t.dueDate < today && !t.completedAt;
          case "today":
            return t.dueDate === today;
          case "upcoming":
            return (
              !!t.dueDate && t.dueDate >= today && t.dueDate <= upcomingEnd
            );
          case "month":
            return !!t.dueDate && t.dueDate.startsWith(monthPrefix);
          case "no-date":
            return !t.dueDate;
          case "all":
          default:
            return true;
        }
      })
      .sort(sortTasks);
  }, [filteredByPriority, dateFilter, today, monthPrefix]);

  const openCount = filteredByPriority.filter((t) => !t.completedAt).length;
  const overdueCount = filteredByPriority.filter(
    (t) => t.dueDate && t.dueDate < today && !t.completedAt,
  ).length;

  function cyclePriority(task: TaskRow) {
    const next = nextPriority(task.priority);
    startPriority(async () => {
      await updateTask({ id: task.id, priority: next });
      router.refresh();
    });
  }

  function goToday() {
    const d = parseISO(`${today}T12:00:00`);
    setCursor(d);
    setSelectedDay(today);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">
            Calendar
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {eventName} · {openCount} open
            {overdueCount > 0 ? (
              <span className="text-[var(--priority-high)]">
                {" "}
                · {overdueCount} overdue
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "month"
                  ? "bg-[var(--ink)] text-[var(--surface)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 border-l border-[var(--hairline)] px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-[var(--ink)] text-[var(--surface)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]",
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowComposer(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-subtle)]">
          Priority
        </span>
        <FilterChip
          active={priorityFilter === "all"}
          onClick={() => setPriorityFilter("all")}
          label="All"
        />
        {PRIORITY_ORDER.map((p) => (
          <FilterChip
            key={p}
            active={priorityFilter === p}
            onClick={() => setPriorityFilter(p)}
            label={PRIORITY_LABELS[p]}
            accent={
              p === "high"
                ? "high"
                : p === "medium"
                  ? "medium"
                  : "low"
            }
          />
        ))}
      </div>

      {showComposer ? (
        <NewTaskComposer
          eventId={eventId}
          users={users}
          currentUserId={currentUserId}
          defaultDueDate={selectedDay}
          onClose={() => setShowComposer(false)}
          onCreated={() => {
            setShowComposer(false);
            router.refresh();
          }}
        />
      ) : null}

      {view === "month" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-1">
                <NavIcon
                  label="Previous month"
                  onClick={() => setCursor((c) => subMonths(c, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </NavIcon>
                <h2 className="min-w-[9.5rem] text-center font-display text-sm font-semibold text-[var(--ink)]">
                  {monthLabel}
                </h2>
                <NavIcon
                  label="Next month"
                  onClick={() => setCursor((c) => addMonths(c, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </NavIcon>
              </div>
              <button
                type="button"
                onClick={goToday}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-tint)]"
              >
                Today
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-[var(--hairline)] bg-[var(--surface-muted)]/60">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-subtle)] sm:text-[11px]"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr">
              {monthDays.map((day) => {
                const key = ymdFromDate(day);
                const inMonth = isSameMonth(day, cursor);
                const isToday = key === today;
                const isSelected = key === selectedDay;
                const dayTasks = tasksByDate.get(key) ?? [];
                const visible = dayTasks.slice(0, 3);
                const overflow = dayTasks.length - visible.length;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDay(key);
                      if (!inMonth) setCursor(day);
                    }}
                    className={cn(
                      "group relative flex min-h-[5.5rem] flex-col gap-1 border-b border-r border-[var(--hairline)] p-1.5 text-left transition-colors sm:min-h-[6.75rem] sm:p-2",
                      !inMonth && "bg-[var(--page)]/80",
                      isSelected && "bg-[var(--accent-tint)]/70",
                      !isSelected && "hover:bg-[var(--surface-muted)]/80",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                        isToday &&
                          "bg-[var(--accent)] font-semibold text-white shadow-[var(--shadow-card)]",
                        !isToday && inMonth && "text-[var(--ink)]",
                        !isToday && !inMonth && "text-[var(--ink-subtle)]",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                      {visible.map((t) => {
                        const overdue =
                          !!t.dueDate && t.dueDate < today && !t.completedAt;
                        return (
                          <div
                            key={t.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ring-1 ring-inset sm:text-[11px]",
                              t.priority === "high" &&
                                "bg-[var(--priority-high-tint)] text-[var(--priority-high)] ring-[var(--priority-high)]/20",
                              t.priority === "medium" &&
                                "bg-[var(--priority-medium-tint)] text-[var(--priority-medium)] ring-[var(--priority-medium)]/20",
                              t.priority === "low" &&
                                "bg-[var(--priority-low-tint)] text-[var(--priority-low)] ring-[var(--priority-low)]/25",
                              overdue && "font-semibold",
                              t.completedAt &&
                                "opacity-50 line-through decoration-[var(--ink-subtle)]",
                            )}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        );
                      })}
                      {overflow > 0 ? (
                        <span className="px-1 text-[10px] text-[var(--ink-subtle)]">
                          +{overflow} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="surface-card flex min-h-[20rem] flex-col overflow-hidden">
            <div className="border-b border-[var(--hairline)] px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ink-subtle)]">
                {selectedDay === today
                  ? "Today"
                  : selectedDay
                    ? format(parseISO(`${selectedDay}T12:00:00`), "EEEE")
                    : "Pick a day"}
              </p>
              <h3 className="font-display text-base font-semibold text-[var(--ink)]">
                {selectedDay
                  ? format(parseISO(`${selectedDay}T12:00:00`), "MMM d, yyyy")
                  : "—"}
              </h3>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {selectedTasks.length === 0 ? (
                <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 text-center">
                  <p className="text-sm text-[var(--ink-muted)]">
                    No tasks due this day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowComposer(true)}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Add a task
                  </button>
                </div>
              ) : (
                selectedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    today={today}
                    currentUserId={currentUserId}
                    onCyclePriority={() => cyclePriority(t)}
                  />
                ))
              )}
            </div>

            {undated.length > 0 ? (
              <div className="border-t border-[var(--hairline)] p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-subtle)]">
                  No due date · {undated.length}
                </p>
                <ul className="space-y-1">
                  {undated.slice(0, 4).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <PriorityFlag
                        priority={t.priority}
                        size="sm"
                        onCycle={() => cyclePriority(t)}
                      />
                      <span className="truncate text-[var(--ink-muted)]">
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                active={dateFilter === f.id}
                onClick={() => setDateFilter(f.id)}
                label={f.label}
                accent={f.id === "overdue" ? "high" : undefined}
              />
            ))}
          </div>

          {listTasks.length === 0 ? (
            <div className="surface-card p-10 text-center text-sm text-[var(--ink-muted)]">
              No tasks match these filters.
            </div>
          ) : (
            <ul className="surface-card divide-y divide-[var(--hairline)] overflow-hidden">
              {listTasks.map((t) => (
                <li key={t.id}>
                  <TaskCard
                    task={t}
                    today={today}
                    currentUserId={currentUserId}
                    onCyclePriority={() => cyclePriority(t)}
                    dense
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: "high" | "medium" | "low";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? accent === "high"
            ? "border-[var(--priority-high)] bg-[var(--priority-high)] text-white"
            : accent === "medium"
              ? "border-[var(--priority-medium)] bg-[var(--priority-medium)] text-white"
              : accent === "low"
                ? "border-[var(--priority-low)] bg-[var(--priority-low)] text-white"
                : "border-[var(--ink)] bg-[var(--ink)] text-[var(--surface)]"
          : "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]",
      )}
    >
      {label}
    </button>
  );
}

function NavIcon({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function TaskCard({
  task,
  today,
  currentUserId,
  onCyclePriority,
  dense = false,
}: {
  task: TaskRow;
  today: string;
  currentUserId: string;
  onCyclePriority: () => void;
  dense?: boolean;
}) {
  const overdue =
    !!task.dueDate && task.dueDate < today && !task.completedAt;
  const isMine = task.assignedTo === currentUserId;

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--surface-muted)]/80",
        dense && "rounded-none px-4 py-3",
      )}
    >
      <div className="pt-0.5">
        <InlineComplete taskId={task.id} completed={!!task.completedAt} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-sm font-medium text-[var(--ink)]",
              task.completedAt &&
                "text-[var(--ink-subtle)] line-through decoration-[var(--ink-subtle)]",
            )}
          >
            {task.title}
          </p>
          <PriorityFlag
            priority={task.priority}
            onCycle={onCyclePriority}
            showLabel={dense}
          />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--ink-muted)]">
          {task.dueDate ? (
            <span
              className={cn(
                overdue &&
                  "font-medium text-[var(--priority-high)]",
              )}
            >
              {task.dueDate === today
                ? "Today"
                : formatDate(`${task.dueDate}T12:00:00Z`)}
            </span>
          ) : (
            <span>No date</span>
          )}
          {task.assigneeName ? (
            <span>{isMine ? "· Me" : `· ${task.assigneeName}`}</span>
          ) : (
            <span>· Unassigned</span>
          )}
          {task.companyName ? (
            task.eventCompanyId ? (
              <Link
                href={`/companies?record=${task.eventCompanyId}`}
                className="truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                · {task.companyName}
              </Link>
            ) : (
              <span className="truncate">· {task.companyName}</span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NewTaskComposer({
  eventId,
  users,
  currentUserId,
  defaultDueDate,
  onClose,
  onCreated,
}: {
  eventId: string;
  users: CalendarUserOption[];
  currentUserId: string;
  defaultDueDate: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      eventId,
      title: (fd.get("title") as string) ?? "",
      dueDate: (fd.get("dueDate") as string) || null,
      priority: ((fd.get("priority") as string) || "medium") as ProspectPriority,
      assignedTo: (fd.get("assignedTo") as string) || currentUserId,
    };

    if (!payload.title.trim()) {
      setError("Title is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createTask(payload);
      if (res.ok) onCreated();
      else setError(res.error);
    });
  };

  return (
    <div className="surface-card p-4 shadow-[var(--shadow-raised)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ink)]">New task</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--ink-subtle)] hover:text-[var(--ink)]"
          aria-label="Close"
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
            <Input
              type="date"
              name="dueDate"
              defaultValue={defaultDueDate ?? undefined}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <select
              name="priority"
              defaultValue="medium"
              className="h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assign to</Label>
            <select
              name="assignedTo"
              defaultValue={currentUserId}
              className="h-9 w-full rounded-md border border-[var(--hairline)] bg-[var(--surface)] px-2 text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
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
          <p className="text-xs text-[var(--priority-high)]">{error}</p>
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
