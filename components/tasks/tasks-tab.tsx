"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createTask,
  deleteTask,
  updateTask,
} from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PersonOption } from "@/components/cells/types";
import { InlineComplete } from "./inline-complete";
import type { TaskRow } from "@/lib/db/queries/tasks";
import { PROSPECT_PRIORITY_VALUES } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TasksTab({
  eventCompanyId,
  tasks,
  owners,
}: {
  eventCompanyId: string;
  tasks: TaskRow[];
  owners: PersonOption[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = tasks.filter((t) => !t.completedAt);
  const completed = tasks.filter((t) => t.completedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Tasks{" "}
          <span className="text-slate-400">
            ({open.length} open · {completed.length} done)
          </span>
        </h3>
        {!adding ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        ) : null}
      </div>

      {adding ? (
        <TaskForm
          owners={owners}
          submitLabel="Create"
          pending={pending}
          error={error}
          onCancel={() => {
            setAdding(false);
            setError(null);
          }}
          onSubmit={(values) =>
            startTransition(async () => {
              const result = await createTask({ eventCompanyId, ...values });
              if (!result.ok) return setError(result.error);
              setAdding(false);
              router.refresh();
            })
          }
        />
      ) : null}

      {tasks.length === 0 && !adding ? (
        <p className="text-xs italic text-slate-500 dark:text-slate-400">
          No tasks yet.
        </p>
      ) : null}

      {open.length > 0 ? (
        <ul className="space-y-1.5">
          {open.map((t) => (
            <TaskRowView key={t.id} task={t} owners={owners} />
          ))}
        </ul>
      ) : null}

      {completed.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Completed ({completed.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {completed.map((t) => (
              <TaskRowView key={t.id} task={t} owners={owners} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function TaskRowView({
  task,
  owners,
}: {
  task: TaskRow;
  owners: PersonOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li>
        <TaskForm
          owners={owners}
          submitLabel="Save"
          pending={pending}
          error={error}
          initial={task}
          onCancel={() => {
            setEditing(false);
            setError(null);
          }}
          onSubmit={(values) =>
            startTransition(async () => {
              const result = await updateTask({ id: task.id, ...values });
              if (!result.ok) return setError(result.error);
              setEditing(false);
              router.refresh();
            })
          }
        />
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40">
      <InlineComplete taskId={task.id} completed={!!task.completedAt} />
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => setEditing(true)}
      >
        <div
          className={cn(
            "text-sm",
            task.completedAt && "text-slate-400 line-through",
          )}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate ? <span>Due {formatDate(task.dueDate)}</span> : null}
          {task.assigneeName ? <span>· {task.assigneeName}</span> : null}
          {task.priority !== "medium" ? (
            <span className="capitalize">· {task.priority}</span>
          ) : null}
        </div>
      </button>
      <button
        type="button"
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-zinc-800"
        title="Delete"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete "${task.title}"?`)) return;
          startTransition(async () => {
            await deleteTask({ id: task.id });
            router.refresh();
          });
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

type TaskFormValues = {
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: (typeof PROSPECT_PRIORITY_VALUES)[number];
  assignedTo: string | null;
};

function TaskForm({
  initial,
  owners,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
}: {
  initial?: TaskRow;
  owners: PersonOption[];
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<TaskFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? null,
    dueDate: initial?.dueDate ?? null,
    priority: initial?.priority ?? "medium",
    assignedTo: initial?.assignedTo ?? null,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.title.trim()) return;
        onSubmit(values);
      }}
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-zinc-900"
    >
      <Input
        autoFocus
        className="h-8"
        placeholder="Task title"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
      />
      <textarea
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-zinc-900 dark:text-slate-100"
        rows={2}
        placeholder="Description (optional)"
        value={values.description ?? ""}
        onChange={(e) =>
          setValues((v) => ({ ...v, description: e.target.value || null }))
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          className="h-8"
          type="date"
          value={values.dueDate ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, dueDate: e.target.value || null }))
          }
        />
        <Select
          className="h-8 text-xs"
          value={values.priority}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              priority: e.target
                .value as (typeof PROSPECT_PRIORITY_VALUES)[number],
            }))
          }
        >
          {PROSPECT_PRIORITY_VALUES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          className="h-8 text-xs"
          value={values.assignedTo ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, assignedTo: e.target.value || null }))
          }
        >
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending || !values.title.trim()}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
