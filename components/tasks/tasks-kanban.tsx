"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setTaskCompleted, updateTask } from "@/lib/actions/tasks";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AssigneePicker } from "./assignee-picker";
import { InlineComplete } from "./inline-complete";
import {
  bucketTasks,
  dueDateForBucket,
  type DueBucketId,
} from "./date-buckets";
import type { UserOption } from "./types";

const COLUMN_ACCENT: Record<DueBucketId, string> = {
  overdue: "bg-red-500",
  today: "bg-amber-500",
  this_week: "bg-sky-500",
  later: "bg-zinc-400",
  no_date: "bg-zinc-300",
  done: "bg-emerald-500",
};

export function TasksKanban({
  tasks: initialTasks,
  users,
  currentUserId,
  includeDone,
}: {
  tasks: TaskRow[];
  users: UserOption[];
  currentUserId: string;
  includeDone: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = useMemo(
    () => bucketTasks(tasks, { includeDone }),
    [tasks, includeDone],
  );

  const dragging = draggingId
    ? (tasks.find((t) => t.id === draggingId) ?? null)
    : null;

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId?.startsWith("col:")) return;
    const target = overId.slice(4) as DueBucketId;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const prev = { ...task };

    if (target === "done") {
      if (task.completedAt) return;
      const completedAt = new Date();
      setTasks((rows) =>
        rows.map((r) => (r.id === id ? { ...r, completedAt } : r)),
      );
      startTransition(async () => {
        const res = await setTaskCompleted({ id, completed: true });
        if (!res.ok) {
          setTasks((rows) =>
            rows.map((r) => (r.id === id ? prev : r)),
          );
          return;
        }
        router.refresh();
      });
      return;
    }

    const nextDue = dueDateForBucket(target);
    const sameDue = (task.dueDate ?? null) === nextDue;
    if (sameDue && !task.completedAt) return;

    setTasks((rows) =>
      rows.map((r) =>
        r.id === id
          ? { ...r, dueDate: nextDue, completedAt: null }
          : r,
      ),
    );

    startTransition(async () => {
      const updates: Promise<{ ok: boolean }>[] = [
        updateTask({ id, dueDate: nextDue }),
      ];
      if (task.completedAt) {
        updates.push(setTaskCompleted({ id, completed: false }));
      }
      const results = await Promise.all(updates);
      if (results.some((r) => !r.ok)) {
        setTasks((rows) => rows.map((r) => (r.id === id ? prev : r)));
        return;
      }
      router.refresh();
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            bucketId={col.id}
            label={col.label}
            tasks={col.tasks}
            users={users}
            currentUserId={currentUserId}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging ? (
          <TaskKanbanCard
            task={dragging}
            users={users}
            currentUserId={currentUserId}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  bucketId,
  label,
  tasks,
  users,
  currentUserId,
}: {
  bucketId: DueBucketId;
  label: string;
  tasks: TaskRow[];
  users: UserOption[];
  currentUserId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${bucketId}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border border-[var(--hairline)] bg-[var(--surface-muted)]/50 transition-[border-color,box-shadow] duration-150",
        isOver &&
          "border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-tint)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full", COLUMN_ACCENT[bucketId])}
          />
          <h3 className="text-xs font-semibold tracking-wide text-[var(--ink)]">
            {label}
          </h3>
        </div>
        <span className="tabular-nums text-[11px] text-[var(--ink-subtle)]">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--hairline)] px-2 py-6 text-center text-[11px] text-[var(--ink-subtle)]">
            Drop here
          </p>
        ) : (
          tasks.map((t) => (
            <DraggableTaskCard
              key={t.id}
              task={t}
              users={users}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  users,
  currentUserId,
}: {
  task: TaskRow;
  users: UserOption[];
  currentUserId: string;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-30")}
    >
      <TaskKanbanCard
        task={task}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function TaskKanbanCard({
  task,
  users,
  currentUserId,
  dragging = false,
}: {
  task: TaskRow;
  users: UserOption[];
  currentUserId: string;
  dragging?: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue =
    !!task.dueDate && new Date(task.dueDate) < today && !task.completedAt;

  return (
    <div
      className={cn(
        "surface-card surface-card-hover cursor-grab space-y-2 p-2.5 active:cursor-grabbing",
        dragging && "shadow-[var(--shadow-raised)] ring-1 ring-[var(--accent)]/20",
      )}
    >
      <div className="flex items-start gap-2">
        <InlineComplete taskId={task.id} completed={!!task.completedAt} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm leading-snug text-[var(--ink)]",
              task.completedAt && "text-[var(--ink-subtle)] line-through",
            )}
          >
            {task.title}
          </p>
          {task.companyName ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--ink-muted)]">
              {task.companyName}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={cn(
                "truncate text-[11px] tabular-nums text-[var(--ink-subtle)]",
                isOverdue && "font-medium text-red-600",
              )}
            >
              {formatDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--ink-subtle)]">No date</span>
          )}
          {task.priority !== "medium" ? (
            <span
              className={cn(
                "rounded px-1 py-0.5 text-[10px] font-medium capitalize",
                task.priority === "high"
                  ? "bg-red-50 text-red-700"
                  : "bg-[var(--surface-muted)] text-[var(--ink-muted)]",
              )}
            >
              {task.priority}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {task.eventCompanyId ? (
            <Link
              href={`/companies?record=${task.eventCompanyId}`}
              scroll={false}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-[var(--ink-subtle)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
              title="Open company"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
          <AssigneePicker
            taskId={task.id}
            assignedTo={task.assignedTo}
            assigneeName={task.assigneeName}
            users={users}
            currentUserId={currentUserId}
            compact
          />
        </div>
      </div>
    </div>
  );
}
