"use client";

import { Check, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { updateTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/cn";
import type { UserOption } from "./types";

export function AssigneePicker({
  taskId,
  assignedTo,
  assigneeName,
  users,
  currentUserId,
  compact = false,
  className,
}: {
  taskId: string;
  assignedTo: string | null;
  assigneeName: string | null;
  users: UserOption[];
  currentUserId: string;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState(assignedTo);
  const [optimisticName, setOptimisticName] = useState(assigneeName);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setOptimisticId(assignedTo);
    setOptimisticName(assigneeName);
  }, [assignedTo, assigneeName]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isMine = optimisticId === currentUserId;
  const label = optimisticName
    ? isMine
      ? "Me"
      : optimisticName.split(" ")[0] ?? optimisticName
    : "Assign";

  const assign = (userId: string | null, name: string | null) => {
    if (userId === optimisticId) {
      setOpen(false);
      return;
    }
    const prevId = optimisticId;
    const prevName = optimisticName;
    setOptimisticId(userId);
    setOptimisticName(name);
    setOpen(false);
    startTransition(async () => {
      const res = await updateTask({ id: taskId, assignedTo: userId });
      if (!res.ok) {
        setOptimisticId(prevId);
        setOptimisticName(prevName);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={pending}
        title={optimisticName ?? "Click to assign"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border text-xs transition-[background-color,border-color,color] duration-150",
          "border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-muted)]",
          "hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30",
          compact ? "h-6 px-1.5" : "h-7 px-2",
          !optimisticId && "border-dashed text-[var(--ink-subtle)]",
          pending && "opacity-60",
        )}
      >
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold uppercase",
            optimisticId
              ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
              : "bg-[var(--surface-muted)] text-[var(--ink-subtle)]",
          )}
        >
          {optimisticName ? (
            optimisticName.charAt(0)
          ) : (
            <UserRound className="h-2.5 w-2.5" />
          )}
        </span>
        {!compact ? <span className="max-w-[6rem] truncate">{label}</span> : null}
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute right-0 z-30 mt-1 max-h-56 w-48 overflow-auto rounded-lg border border-[var(--hairline)] bg-[var(--surface)] py-1 shadow-[var(--shadow-overlay)]"
        >
          <li role="option" aria-selected={optimisticId === null}>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
              onClick={(e) => {
                e.stopPropagation();
                assign(null, null);
              }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-muted)]">
                <UserRound className="h-3 w-3" />
              </span>
              Unassigned
              {optimisticId === null ? (
                <Check className="ml-auto h-3.5 w-3.5 text-[var(--accent)]" />
              ) : null}
            </button>
          </li>
          {users.map((u) => {
            const selected = optimisticId === u.id;
            return (
              <li key={u.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    assign(u.id, u.name);
                  }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[10px] font-semibold uppercase text-[var(--accent-strong)]">
                    {u.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {u.id === currentUserId ? `${u.name} (me)` : u.name}
                  </span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
